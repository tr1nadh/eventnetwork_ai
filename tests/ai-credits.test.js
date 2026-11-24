import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

let vite;
let credits;
let redis;
let burst;

before(async () => {
  vite = await createServer({
    configFile: false,
    server: { middlewareMode: true, ws: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    resolve: {
      alias: { '$env/static/private': fileURLToPath(new URL('./env-mock.js', import.meta.url)) }
    }
  });
  credits = await vite.ssrLoadModule('/src/lib/server/ai-credits.js');
});

after(async () => { await vite?.close(); });

beforeEach(() => {
  const values = new Map();
  const expiries = new Map();
  redis = {
    values,
    async get(key) { return values.get(key) ?? null; },
    async incr(key) {
      const value = (values.get(key) ?? 0) + 1;
      values.set(key, value);
      return value;
    },
    async decr(key) {
      const value = (values.get(key) ?? 0) - 1;
      values.set(key, value);
      return value;
    },
    async set(key, value) { values.set(key, value); },
    async ttl(key) { return expiries.get(key) ?? -1; },
    async expire(key, seconds) { expiries.set(key, seconds); }
  };
  burst = new Map();
  credits.__setRedisClient(redis);
  credits.__setBurstLimiter({
    async limit(userId) {
      const count = (burst.get(userId) ?? 0) + 1;
      burst.set(userId, count);
      return { success: count <= 20 };
    }
  });
});

function monthlyKey(userId, monthOffset = 0) {
  const now = new Date();
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthOffset, 1));
  return 'ai:monthly:' + userId + ':' + month.toISOString().slice(0, 7);
}

test('new AI users start with the full monthly credit pool', async () => {
  const status = await credits.getAiCreditStatus('new-user');
  assert.equal(status.used, 0);
  assert.equal(status.remaining, 10);
});

test('each reservation consumes one credit from the shared pool', async () => {
  for (const used of [1, 2, 3, 4]) {
    const result = await credits.checkAiQuota('shared');
    assert.equal(result.allowed, true);
    assert.equal(result.used, used);
    assert.equal(result.remaining, 10 - used);
  }
  assert.equal((await credits.getAiCreditStatus('shared')).remaining, 6);
});

test('the tenth reservation succeeds and subsequent ones preserve the cap', async () => {
  await redis.set(monthlyKey('limit'), 9);
  const last = await credits.checkAiQuota('limit');
  assert.equal(last.allowed, true);
  assert.equal(last.remaining, 0);
  const extra = await credits.checkAiQuota('limit');
  assert.equal(extra.allowed, false);
  assert.equal(extra.reason, 'MONTHLY_AI_LIMIT_EXCEEDED');
  assert.equal(await redis.get(monthlyKey('limit')), 10);
});

test('the burst limiter blocks the 21st operation even if credits remain', async () => {
  for (let i = 0; i < 20; i++) {
    const result = await credits.checkAiQuota('burst');
    assert.equal(result.allowed, true);
    await credits.refundAiCredit('burst');
  }
  assert.equal((await credits.checkAiQuota('burst')).reason, 'RATE_LIMIT_EXCEEDED');
  assert.equal((await credits.getAiCreditStatus('burst')).used, 0);
});

test('refunding a failed operation restores its credit', async () => {
  await redis.set(monthlyKey('failed'), 5);
  const reservation = await credits.checkAiQuota('failed');
  assert.equal(reservation.used, 6);
  await credits.refundAiCredit('failed', reservation.reservationKey);
  assert.equal((await credits.getAiCreditStatus('failed')).used, 5);
});

test('a refund from a previous month preserves the current month’s credits', async () => {
  await redis.set(monthlyKey('previous'), 2);
  await credits.refundAiCredit('previous', monthlyKey('previous', -1));
  assert.equal((await credits.getAiCreditStatus('previous')).used, 2);
});

test('concurrent operations cannot both spend the last credit', async () => {
  await redis.set(monthlyKey('concurrent'), 9);
  const results = await Promise.all([
    credits.checkAiQuota('concurrent'),
    credits.checkAiQuota('concurrent')
  ]);
  assert.equal(results.filter(result => result.allowed).length, 1);
  assert.equal(results.find(result => !result.allowed).reason, 'MONTHLY_AI_LIMIT_EXCEEDED');
  assert.equal(await redis.get(monthlyKey('concurrent')), 10);
});

test('AI credit usage belongs to the current user', async () => {
  await credits.checkAiQuota('first');
  await credits.checkAiQuota('second');
  await credits.checkAiQuota('second');
  assert.equal((await credits.getAiCreditStatus('first')).used, 1);
  assert.equal((await credits.getAiCreditStatus('second')).used, 2);
});

test('a new month starts with a fresh credit pool', async () => {
  const past = monthlyKey('month', -1);
  await redis.set(past, 10);
  assert.equal((await credits.getAiCreditStatus('month')).remaining, 10);
  assert.equal(await redis.get(past), 10);
});

test('the first reservation sets an expiry on the monthly key', async () => {
  await credits.checkAiQuota('ttl');
  assert.ok(await redis.ttl(monthlyKey('ttl')) > 0);
});

test('unauthenticated requests do not reserve credit or burst allowance', async () => {
  assert.equal((await credits.checkAiQuota(undefined)).reason, 'UNAUTHORIZED');
  assert.equal(redis.values.size, 0);
  assert.equal(burst.size, 0);
});

test('credit status supplies the next reset as a valid timestamp', async () => {
  const status = await credits.getAiCreditStatus('status');
  assert.equal(status.limit, 10);
  assert.equal(status.used, 0);
  assert.equal(status.remaining, 10);
  assert.ok(Date.parse(status.resetAt) > Date.now());
});
