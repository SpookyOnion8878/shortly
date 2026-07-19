/**
 * High-level "shortener" service — the use-cases the app exposes.
 *
 * This is the orchestration layer. The API routes stay thin: they parse input,
 * call these functions, and translate results into HTTP responses. Keeping
 * business logic here makes it trivially testable and reusable.
 */

import { getStore } from "./db";
import { generateShortCode, isValidCodeFormat } from "./short-code";
import { validateUrl } from "./url";
import { recordVisit, buildStats } from "./analytics";
import type {
  LinkRecord,
  LinkStats,
  ShortenResult,
  VisitEvent
} from "./types";
import { BASE_URL } from "./env";

export interface ShortenOptions {
  /** Optional custom code requested by the user. */
  customCode?: string;
  /** Optional ISO timestamp after which the link stops working. */
  expiresAt?: string;
  /** Optional human note. */
  note?: string;
}

/** Build the public short URL for a code. */
export function shortUrlFor(code: string): string {
  return `${BASE_URL}/${code}`;
}

/**
 * Create a short link.
 *
 * @throws Error with a user-friendly message on validation / collision failure.
 */
export async function createShortLink(
  rawUrl: string,
  opts: ShortenOptions = {}
): Promise<ShortenResult> {
  const check = await validateUrl(rawUrl);
  if (!check.ok || !check.url) {
    throw new Error(check.reason ?? "Invalid URL.");
  }
  const url = check.url;

  const store = getStore();
  let code: string;

  if (opts.customCode) {
    const clean = opts.customCode.trim();
    if (!isValidCodeFormat(clean)) {
      throw new Error(
        "Custom code contains invalid characters or is too long."
      );
    }
    if (await store.exists(clean)) {
      throw new Error("That custom code is already taken.");
    }
    code = clean;
  } else {
    // Generate with bounded collision retries.
    let attempt = 0;
    do {
      code = generateShortCode();
      attempt += 1;
      if (attempt > 10) {
        throw new Error("Could not allocate a short code; please retry.");
      }
    } while (await store.exists(code));
  }

  if (opts.expiresAt) {
    const t = new Date(opts.expiresAt);
    if (Number.isNaN(t.getTime())) {
      throw new Error("Invalid expiresAt timestamp.");
    }
  }

  const record: LinkRecord = {
    code,
    url,
    clicks: 0,
    createdAt: new Date().toISOString(),
    expiresAt: opts.expiresAt,
    note: opts.note,
    events: [],
    buckets: []
  };
  await store.insert(record);

  return {
    code,
    shortUrl: shortUrlFor(code),
    url,
    createdAt: record.createdAt
  };
}

/** Look up a link record by code (null if missing or expired). */
export async function resolveLink(
  code: string
): Promise<LinkRecord | null> {
  if (!isValidCodeFormat(code)) return null;
  const store = getStore();
  const record = await store.get(code);
  if (!record) return null;
  if (record.expiresAt && new Date(record.expiresAt).getTime() <= Date.now()) {
    return null;
  }
  return record;
}

/**
 * Record a click and persist the updated statistics.
 *
 * The analytics dimension values are derived here from request metadata so the
 * API route doesn't need to know about User-Agent parsing.
 */
export async function registerClick(
  record: LinkRecord,
  meta: {
    userAgent?: string | null;
    country?: string | null;
    referer?: string | null;
  }
): Promise<void> {
  const event: Omit<VisitEvent, "at"> = {
    country: meta.country || undefined,
    browser: undefined,
    os: undefined,
    referer: undefined
  };
  // UA-derived fields are filled by analytics helpers when persisted.
  const { detectBrowser, detectOs, refererHost } = await import("./analytics");
  event.browser = detectBrowser(meta.userAgent ?? undefined);
  event.os = detectOs(meta.userAgent ?? undefined);
  event.referer = refererHost(meta.referer ?? undefined);

  recordVisit(record, event);
  await getStore().update(record);
}

/** Return aggregate stats for one link. */
export async function getStats(code: string): Promise<LinkStats | null> {
  const record = await resolveLink(code);
  if (!record) return null;
  return buildStats(record);
}

/** List every link (for the dashboard / management view). */
export async function listLinks(): Promise<LinkRecord[]> {
  return getStore().list();
}
