/**
 * In-memory sliding-window rate limiter (per IP).
 *
 * This is intentionally simple and process-local: it protects a single
 * Node instance from abuse of the create endpoint. On multi-instance
 * deployments you would swap this for a shared limiter (e.g. Redis
 * `INCR` + `EXPIRE`); the function signature stays identical.
 */

import { RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS } from "./env";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/** Returns whether `key` (typically an IP) is under its request quota. */
export function rateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, retryAfterMs: 0 };
  }

  existing.count += 1;
  if (existing.count > RATE_LIMIT_MAX) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: existing.resetAt - now
    };
  }
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX - existing.count,
    retryAfterMs: 0
  };
}

/** Periodic cleanup so the map doesn't grow forever with dead IPs. */
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
}, RATE_LIMIT_WINDOW_MS * 2).unref();
