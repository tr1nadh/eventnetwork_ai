// tests/ai-credits.test.js
// Uses in-memory mocks — no real Redis or Fireworks calls are made.

import { expect, test, describe, beforeEach } from 'vitest';
import {
  checkAiQuota,
  refundAiCredit,
  getAiCreditStatus,
  MONTHLY_LIMIT,
  __setRedisClient,
  __setBurstLimiter
} from '../src/lib/server/ai-credits.js';

// ─── In-memory Mock Redis ───────────────────────────────────────────────
class MockRedis {
  constructor() {
    this.store = new Map();
    this.ttls = new Map();
  }
  async incr(key) {
    const val = (this.store.get(key) ?? 0) + 1;
    this.store.set(key, val);
    return val;
  }
  async decr(key) {
    const val = Math.max((this.store.get(key) ?? 0) - 1, 0);
    this.store.set(key, val);
    return val;
  }
  async get(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  async set(key, value) {
    this.store.set(key, typeof value === 'number' ? value : parseInt(value, 10));
  }
  async del(key) {
    this.store.delete(key);
    this.ttls.delete(key);
  }
  async ttl(key) {
    const expireAt = this.ttls.get(key);
    if (expireAt === undefined) return -1;
    const remaining = Math.floor((expireAt - Date.now()) / 1000);
    return remaining > 0 ? remaining : -2;
  }
  async expire(key, seconds) {
    this.ttls.set(key, Date.now() + seconds * 1000);
    return true;
  }
  async keys(pattern) {
    // Simple glob: only supports 'prefix*'
    const prefix = pattern.replace('*', '');
    return [...this.store.keys()].filter(k => k.startsWith(prefix));
  }
}

// ─── Mock Burst Limiter ─────────────────────────────────────────────────
class MockBurstLimiter {
  constructor() { this.counts = new Map(); }
  async limit(userId) {
    const n = (this.counts.get(userId) ?? 0) + 1;
    this.counts.set(userId, n);
    return { success: n <= 20 };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────
function monthlyKey(userId) {
  const d = new Date();
  return `ai:monthly:${userId}:${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

// ─── Setup ──────────────────────────────────────────────────────────────
let mockRedis;
let mockBurst;

beforeEach(() => {
  mockRedis = new MockRedis();
  mockBurst = new MockBurstLimiter();
  __setRedisClient(mockRedis);
  __setBurstLimiter(mockBurst);
});

// ─── Tests ──────────────────────────────────────────────────────────────
describe('AI credit and rate‑limit utilities', () => {

  test('TEST 1 – New user starts with zero usage', async () => {
    const status = await getAiCreditStatus('new-user');
    expect(status.used).toBe(0);
    expect(status.remaining).toBe(MONTHLY_LIMIT);
    expect(status.limit).toBe(50);
  });

  test('TEST 2 – Credit consumption per successful call', async () => {
    let res = await checkAiQuota('user-consume');
    expect(res.allowed).toBe(true);
    expect(res.used).toBe(1);
    expect(res.remaining).toBe(49);

    res = await checkAiQuota('user-consume');
    expect(res.allowed).toBe(true);
    expect(res.used).toBe(2);
    expect(res.remaining).toBe(48);
  });

  test('TEST 3 – Shared credit pool across features', async () => {
    // Simulate Find Matches, Profile Auto-Fill, Meeting Prep, Dummy Users
    for (let i = 0; i < 4; i++) {
      const r = await checkAiQuota('user-shared');
      expect(r.allowed).toBe(true);
    }
    const status = await getAiCreditStatus('user-shared');
    expect(status.used).toBe(4);
    expect(status.remaining).toBe(46);
  });

  test('TEST 4 – Monthly limit enforcement (no extra AI calls)', async () => {
    // Pre-seed usage to 49
    await mockRedis.set(monthlyKey('user-limit'), 49);

    // 50th request – allowed
    let r = await checkAiQuota('user-limit');
    expect(r.allowed).toBe(true);
    expect(r.used).toBe(50);

    // 51st request – blocked
    r = await checkAiQuota('user-limit');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('MONTHLY_AI_LIMIT_EXCEEDED');

    // Counter must never exceed 50
    const val = await mockRedis.get(monthlyKey('user-limit'));
    expect(val).toBe(50);
  });

  test('TEST 5 – Burst limit (20 per minute)', async () => {
    for (let i = 0; i < 20; i++) {
      const r = await checkAiQuota('user-burst');
      expect(r.allowed).toBe(true);
    }
    // 21st request blocked by burst limiter
    const r = await checkAiQuota('user-burst');
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('RATE_LIMIT_EXCEEDED');
  });

  test('TEST 6 – Failed AI operation refunds credit', async () => {
    await mockRedis.set(monthlyKey('user-fail'), 10);

    // Reserve a credit
    const reserve = await checkAiQuota('user-fail');
    expect(reserve.allowed).toBe(true);
    expect(reserve.used).toBe(11);

    // Simulate provider failure → refund
    await refundAiCredit('user-fail');

    const status = await getAiCreditStatus('user-fail');
    expect(status.used).toBe(10);
  });

  test('TEST 7 – Concurrent requests cannot exceed quota', async () => {
    await mockRedis.set(monthlyKey('user-conc'), 49);

    // Fire two requests in parallel
    const [r1, r2] = await Promise.all([
      checkAiQuota('user-conc'),
      checkAiQuota('user-conc')
    ]);

    const allowed = [r1, r2].filter(r => r.allowed);
    const blocked = [r1, r2].filter(r => !r.allowed);

    expect(allowed).toHaveLength(1);
    expect(blocked).toHaveLength(1);
    expect(blocked[0].reason).toBe('MONTHLY_AI_LIMIT_EXCEEDED');

    const final = await mockRedis.get(monthlyKey('user-conc'));
    expect(final).toBe(50);
  });

  test('TEST 8 – User isolation', async () => {
    await mockRedis.set(monthlyKey('user-A'), 40);
    await mockRedis.set(monthlyKey('user-B'), 5);

    await checkAiQuota('user-A'); // A → 41
    await checkAiQuota('user-B'); // B → 6
    await checkAiQuota('user-B'); // B → 7

    const aStatus = await getAiCreditStatus('user-A');
    const bStatus = await getAiCreditStatus('user-B');
    expect(aStatus.used).toBe(41);
    expect(bStatus.used).toBe(7);
  });

  test('TEST 9 – Month change resets quota', async () => {
    // Simulate a PAST month key (June 2026) with 50 usage
    const pastKey = 'ai:monthly:user-month:2026-06';
    await mockRedis.set(pastKey, 50);

    // Current month (July) status uses a DIFFERENT key → 0 usage
    const status = await getAiCreditStatus('user-month');
    expect(status.used).toBe(0);
    expect(status.remaining).toBe(50);

    // Past month key untouched
    const pastVal = await mockRedis.get(pastKey);
    expect(pastVal).toBe(50);
  });

  test('TEST 10 – TTL is set on monthly key', async () => {
    await checkAiQuota('user-ttl');
    const key = monthlyKey('user-ttl');
    const ttl = await mockRedis.ttl(key);
    expect(ttl).toBeGreaterThan(0);
  });

  test('TEST 11 – Unauthenticated request does not touch Redis', async () => {
    const keysBefore = await mockRedis.keys('ai:monthly:');
    const result = await checkAiQuota(undefined);
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('UNAUTHORIZED');
    // No new monthly keys should have been created
    const keysAfter = await mockRedis.keys('ai:monthly:');
    expect(keysAfter.length).toBe(keysBefore.length);
  });

  test('TEST 12 – Credit status endpoint shape', async () => {
    const status = await getAiCreditStatus('user-shape');
    expect(status).toMatchObject({
      limit: 50,
      used: expect.any(Number),
      remaining: expect.any(Number),
      resetAt: expect.any(String)
    });
  });
});
