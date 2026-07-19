/**
 * Centralised, type-safe access to environment configuration.
 *
 * Reading env vars through this module (instead of sprinkling `process.env`
 * everywhere) gives us one place to document defaults, coerce types and
 * fail fast when a required value is missing in production.
 */

function bool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return value.toLowerCase() === "true" || value === "1";
}

function int(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

/** Resolve the public base URL that short links are built from. */
export const BASE_URL: string =
  process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") || "http://localhost:3000";

/** Number of characters in a generated short code. */
export const SHORT_CODE_LENGTH: number = int(
  process.env.SHORT_CODE_LENGTH,
  6
);

/**
 * Default alphabet avoids ambiguous characters (no 0/O, 1/l/I) so codes are
 * easy to read aloud and transcribe. 56 symbols ^ 6 ≈ 20 billion combinations.
 */
export const SHORT_CODE_ALPHABET: string =
  process.env.SHORT_CODE_ALPHABET ||
  "23456789abcdefghijkmnpqrstuvwxyz";

/** When true, URLs pointing to private/local networks are rejected (SSRF guard). */
export const BLOCK_PRIVATE_TARGETS: boolean = bool(
  process.env.BLOCK_PRIVATE_TARGETS,
  true
);

/** Maximum requests per window for the shorten endpoint. */
export const RATE_LIMIT_MAX: number = int(process.env.RATE_LIMIT_MAX, 20);

/** Sliding window length for the rate limiter, in milliseconds. */
export const RATE_LIMIT_WINDOW_MS: number = int(
  process.env.RATE_LIMIT_WINDOW_MS,
  60000
);

/** Max raw visit events retained per link before they are aggregated away. */
export const VISIT_EVENT_CAP: number = int(process.env.VISIT_EVENT_CAP, 5000);

/** Upstash Redis credentials; presence enables the Redis store. */
export const UPSTASH_URL: string | undefined =
  process.env.UPSTASH_REDIS_REST_URL;
export const UPSTASH_TOKEN: string | undefined =
  process.env.UPSTASH_REDIS_REST_TOKEN;

/** True when Redis is configured; otherwise the file store is used. */
export const USE_REDIS: boolean =
  Boolean(UPSTASH_URL) && Boolean(UPSTASH_TOKEN);
