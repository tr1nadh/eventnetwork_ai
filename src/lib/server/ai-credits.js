import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';
import { KV_REST_API_URL, KV_REST_API_TOKEN } from '$env/static/private';

const MONTHLY_LIMIT = 50;

// Initialize Redis explicitly to avoid process.env issues in serverless
const redis = new Redis({
  url: KV_REST_API_URL,
  token: KV_REST_API_TOKEN,
});

// Create a burst ratelimiter (20 requests per 1 minute)
const burstLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
  prefix: 'ai:burst',
});

function getMonthlyKey(userId) {
  const date = new Date();
  const year = date.getUTCFullYear();
  // Months are 0-indexed in JS, so add 1 and pad with zero
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `ai:monthly:${userId}:${year}-${month}`;
}

function getNextMonthDate() {
  const date = new Date();
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return new Date(Date.UTC(year, month + 1, 1));
}

/**
 * Validates burst limits and monthly quotas, reserving a credit if allowed.
 * @param {string} userId The Supabase user ID
 * @returns {Promise<{ allowed: boolean, reason?: string, errorData?: any, remaining?: number, used?: number }>}
 */
export async function checkAiQuota(userId) {
  // 1. Check Burst Limiter
  const { success } = await burstLimiter.limit(userId);
  if (!success) {
    return {
      allowed: false,
      reason: 'RATE_LIMIT_EXCEEDED',
      errorData: {
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'You\'re making AI requests too quickly. Please wait a moment and try again.'
      }
    };
  }

  // 2. Check and Increment Monthly Quota (Atomic)
  const monthlyKey = getMonthlyKey(userId);
  
  // Increment usage
  const currentUsage = await redis.incr(monthlyKey);
  
  // Ensure the key has an expiry set to the start of the next month (1st day 00:00 UTC).
  const ttl = await redis.ttl(monthlyKey);
  if (ttl === -1) {
    // Calculate seconds until the first day of the next month (UTC)
    const now = new Date();
    const resetDate = getNextMonthDate(); // defined earlier in this file
    const secondsToReset = Math.floor((resetDate.getTime() - now.getTime()) / 1000);
    // Fallback to a safe 1‑day expiry if calculation somehow yields non‑positive value
    const expireIn = secondsToReset > 0 ? secondsToReset : 60 * 60 * 24;
    await redis.expire(monthlyKey, expireIn);
  }

  if (currentUsage > MONTHLY_LIMIT) {
    // Refund the reservation since they were over limit
    await redis.decr(monthlyKey);
    return {
      allowed: false,
      reason: 'MONTHLY_AI_LIMIT_EXCEEDED',
      errorData: {
        error: 'MONTHLY_AI_LIMIT_EXCEEDED',
        message: 'You\'ve used all 50 AI credits for this month.',
        resetAt: getNextMonthDate().toISOString()
      }
    };
  }

  return {
    allowed: true,
    used: currentUsage,
    remaining: MONTHLY_LIMIT - currentUsage
  };
}

/**
 * Refunds a credit if an AI operation fails after a successful reservation.
 * @param {string} userId The Supabase user ID
 */
export async function refundAiCredit(userId) {
  const monthlyKey = getMonthlyKey(userId);
  // Ensure we don't drop below 0 just in case
  const current = await redis.get(monthlyKey);
  if (current && parseInt(current.toString(), 10) > 0) {
    await redis.decr(monthlyKey);
  }
}

/**
 * Retrieves the current user's AI credit status without consuming any.
 * @param {string} userId The Supabase user ID
 */
export async function getAiCreditStatus(userId) {
  const monthlyKey = getMonthlyKey(userId);
  const val = await redis.get(monthlyKey);
  const used = val ? parseInt(val.toString(), 10) : 0;
  
  return {
    limit: MONTHLY_LIMIT,
    used: Math.min(used, MONTHLY_LIMIT), // Don't show >50 if something weird happens
    remaining: Math.max(0, MONTHLY_LIMIT - used),
    resetAt: getNextMonthDate().toISOString()
  };
}
