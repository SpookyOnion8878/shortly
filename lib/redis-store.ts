/**
 * Upstash Redis-backed store (serverless-friendly, HTTP-based).
 *
 * Upstash exposes Redis over REST, which means it works on platforms like
 * Vercel where you cannot keep a long-lived TCP socket open. We store one Redis
 * hash per link for the link fields, and keep the analytics inside that same
 * hash (as JSON sub-keys) so a click is a single atomic HSET.
 *
 * Key layout (all under {@link LINK_PREFIX}):
 *   <code>  →  HASH { url, clicks, createdAt, expiresAt?, note?, events, buckets }
 *
 * `events` and `buckets` are stored as JSON strings to avoid serialising the
 * whole time series into many keys (which would be slower and costlier).
 */

import { Redis } from "@upstash/redis";
import { UPSTASH_TOKEN, UPSTASH_URL, VISIT_EVENT_CAP } from "./env";
import type { LinkRecord, VisitBucket, VisitEvent } from "./types";
import type { Store } from "./db";

/** Key prefix for all link hashes in Redis. */
export const LINK_PREFIX = "shortly:link:";

/** Name of the (optional) Upstash Redis env so callers can detect misuse. */
export const EVENT_CAP = VISIT_EVENT_CAP;

function client(): Redis {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    throw new Error(
      "Upstash Redis is enabled but UPSTASH_REDIS_REST_URL / _TOKEN are missing."
    );
  }
  return new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN });
}

function toHash(r: LinkRecord): Record<string, string> {
  return {
    code: r.code,
    url: r.url,
    clicks: String(r.clicks),
    createdAt: r.createdAt,
    expiresAt: r.expiresAt ?? "",
    note: r.note ?? "",
    events: JSON.stringify(r.events),
    buckets: JSON.stringify(r.buckets)
  };
}

function fromHash(code: string, h: Record<string, unknown>): LinkRecord | null {
  if (!h || !h.url) return null;
  return {
    code,
    url: String(h.url),
    clicks: Number(h.clicks) || 0,
    createdAt: String(h.createdAt),
    expiresAt: h.expiresAt ? String(h.expiresAt) : undefined,
    note: h.note ? String(h.note) : undefined,
    events: safeParse<VisitEvent[]>(h.events, []),
    buckets: safeParse<VisitBucket[]>(h.buckets, [])
  };
}

function safeParse<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export class RedisStore implements Store {
  async get(code: string): Promise<LinkRecord | null> {
    const r = client();
    const h = await r.hgetall(`${LINK_PREFIX}${code}`);
    return fromHash(code, h as Record<string, unknown>);
  }

  async insert(record: LinkRecord): Promise<void> {
    const r = client();
    await r.hset(`${LINK_PREFIX}${record.code}`, toHash(record));
  }

  async update(record: LinkRecord): Promise<void> {
    const r = client();
    await r.hset(`${LINK_PREFIX}${record.code}`, toHash(record));
  }

  async list(): Promise<LinkRecord[]> {
    const r = client();
    const keys = await r.keys(`${LINK_PREFIX}*`);
    if (keys.length === 0) return [];
    const all = await Promise.all(
      keys.map(async (k) => {
        const h = await r.hgetall(k);
        const code = k.replace(LINK_PREFIX, "");
        return fromHash(code, h as Record<string, unknown>);
      })
    );
    return all
      .filter((x): x is LinkRecord => x !== null)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async exists(code: string): Promise<boolean> {
    const r = client();
    return (await r.exists(`${LINK_PREFIX}${code}`)) === 1;
  }
}
