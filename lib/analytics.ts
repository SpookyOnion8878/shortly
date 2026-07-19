/**
 * Analytics: turning raw click events into useful, bounded aggregates.
 *
 * Storing every raw click forever is wasteful and unbounded. Instead we keep a
 * rolling window of recent raw {@link VisitEvent}s (capped by VISIT_EVENT_CAP)
 * for the "recent activity" view, and ALWAYS maintain pre-computed daily
 * {@link VisitBucket}s. When the raw-event cap is exceeded we fold the oldest
 * events into their day buckets and drop the raw copies. This keeps storage
 * roughly O(days) instead of O(clicks) while preserving all aggregate stats.
 */

import type { VisitBucket, VisitEvent, LinkRecord, LinkStats } from "./types";
import { VISIT_EVENT_CAP } from "./env";

/** Derive the browser family from a User-Agent string. */
export function detectBrowser(ua: string | null | undefined): string {
  if (!ua) return "Unknown";
  const u = ua;
  if (/Edg\//.test(u)) return "Edge";
  if (/OPR\/|Opera/.test(u)) return "Opera";
  if (/Firefox\//.test(u)) return "Firefox";
  if (/Chrome\//.test(u)) return "Chrome";
  if (/Safari\//.test(u)) return "Safari";
  if (/curl\//.test(u)) return "curl";
  if (/bot|crawler|spider|http/i.test(u)) return "Bot";
  return "Other";
}

/** Derive the operating system from a User-Agent string. */
export function detectOs(ua: string | null | undefined): string {
  if (!ua) return "Unknown";
  const u = ua;
  if (/Windows NT/.test(u)) return "Windows";
  if (/Android/.test(u)) return "Android";
  if (/iPhone|iPad|iPod/.test(u)) return "iOS";
  if (/Mac OS X/.test(u)) return "macOS";
  if (/Linux/.test(u)) return "Linux";
  if (/CrOS/.test(u)) return "ChromeOS";
  return "Other";
}

/** Extract a clean two-letter country code from a header like "US, CA". */
export function detectCountry(header: string | null | undefined): string | undefined {
  if (!header) return undefined;
  const first = header.split(",")[0]?.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(first || "")) return first as string;
  return undefined;
}

/** Extract the bare host from a referer URL, if present. */
export function refererHost(referer: string | null | undefined): string | undefined {
  if (!referer) return undefined;
  try {
    return new URL(referer).hostname || undefined;
  } catch {
    return undefined;
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function emptyBucket(date: string): VisitBucket {
  return {
    date,
    count: 0,
    byCountry: {},
    byBrowser: {},
    byOs: {},
    byReferer: {}
  };
}

function addTo(map: Record<string, number>, key: string | undefined, n = 1): void {
  const k = key || "Unknown";
  map[k] = (map[k] || 0) + n;
}

/**
 * Record a new click on a link record, mutating it in place and enforcing the
 * event cap by folding overflow into daily buckets.
 *
 * @returns the same (mutated) record for convenience.
 */
export function recordVisit(
  record: LinkRecord,
  event: Omit<VisitEvent, "at">
): LinkRecord {
  const at = new Date().toISOString();
  const full: VisitEvent = { at, ...event };

  record.clicks += 1;
  record.events.push(full);

  // Ensure today's bucket exists.
  const day = at.slice(0, 10);
  let bucket = record.buckets.find((b) => b.date === day);
  if (!bucket) {
    bucket = emptyBucket(day);
    record.buckets.push(bucket);
  }
  bucket.count += 1;
  addTo(bucket.byCountry, event.country);
  addTo(bucket.byBrowser, event.browser);
  addTo(bucket.byOs, event.os);
  addTo(bucket.byReferer, event.referer);

  // Enforce the raw-event cap: fold the oldest events away.
  const cap = VISIT_EVENT_CAP;
  if (cap > 0 && record.events.length > cap) {
    const overflow = record.events.splice(0, record.events.length - cap);
    for (const ev of overflow) {
      const d = (ev.at || todayIso()).slice(0, 10);
      let b = record.buckets.find((x) => x.date === d);
      if (!b) {
        b = emptyBucket(d);
        record.buckets.push(b);
      }
      // Overflow events were already counted in their day bucket when recorded,
      // so we only need to guarantee the bucket exists; no double counting.
    }
  }

  return record;
}

/** Merge several buckets that share a date (keeps buckets de-duplicated). */
function coalesceBuckets(buckets: VisitBucket[]): VisitBucket[] {
  const map = new Map<string, VisitBucket>();
  for (const b of buckets) {
    const cur = map.get(b.date) ?? emptyBucket(b.date);
    cur.count += b.count;
    for (const [k, v] of Object.entries(b.byCountry)) addTo(cur.byCountry, k, v);
    for (const [k, v] of Object.entries(b.byBrowser)) addTo(cur.byBrowser, k, v);
    for (const [k, v] of Object.entries(b.byOs)) addTo(cur.byOs, k, v);
    for (const [k, v] of Object.entries(b.byReferer)) addTo(cur.byReferer, k, v);
    map.set(b.date, cur);
  }
  return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Build the public-facing stats object used by the dashboard. */
export function buildStats(record: LinkRecord): LinkStats {
  const buckets = coalesceBuckets(record.buckets);
  const merge = (key: "byCountry" | "byBrowser" | "byOs" | "byReferer") => {
    const out: Record<string, number> = {};
    for (const b of buckets) {
      for (const [k, v] of Object.entries(b[key])) addTo(out, k, v);
    }
    return out;
  };
  return {
    code: record.code,
    url: record.url,
    clicks: record.clicks,
    createdAt: record.createdAt,
    expiresAt: record.expiresAt,
    series: buckets.map((b) => ({ date: b.date, count: b.count })),
    byCountry: merge("byCountry"),
    byBrowser: merge("byBrowser"),
    byOs: merge("byOs"),
    byReferer: merge("byReferer"),
    retainedEvents: record.events.length
  };
}
