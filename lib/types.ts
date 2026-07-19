/**
 * Core domain types shared across the server and client.
 *
 * These types model a "link" (a shortened URL) and the "visit" events
 * recorded when someone clicks a short link. Keeping them in one place
 * avoids drift between the API contract and the UI.
 */

/** A single shortened link plus its aggregate statistics. */
export interface Link {
  /** The unique short code, e.g. "aZ3k9x". */
  code: string;
  /** The original (long) destination URL. */
  url: string;
  /** Number of times this link has been clicked. */
  clicks: number;
  /** ISO-8601 timestamp of creation. */
  createdAt: string;
  /** If set, the link becomes inactive after this ISO-8601 timestamp. */
  expiresAt?: string;
  /** Human-provided note/label (optional, not exposed in the short URL). */
  note?: string;
}

/** A raw click event. Stored only up to {@link VISIT_EVENT_CAP}. */
export interface VisitEvent {
  /** ISO-8601 timestamp of the click. */
  at: string;
  /** Two-letter country code when known (e.g. "US"). */
  country?: string;
  /** Browser family derived from the User-Agent (e.g. "Chrome"). */
  browser?: string;
  /** Operating system derived from the User-Agent (e.g. "Windows"). */
  os?: string;
  /** Referring host, when the click came from another site. */
  referer?: string;
}

/** A pre-aggregated bucket so we never have to scan every raw event. */
export interface VisitBucket {
  /** ISO date (YYYY-MM-DD) this bucket summarises. */
  date: string;
  /** Total clicks recorded in this day. */
  count: number;
  /** Clicks per country code, e.g. { US: 12, ID: 8 }. */
  byCountry: Record<string, number>;
  /** Clicks per browser family. */
  byBrowser: Record<string, number>;
  /** Clicks per operating system. */
  byOs: Record<string, number>;
  /** Clicks per referring host. */
  byReferer: Record<string, number>;
}

/** The full persisted record for a link (link fields + analytics data). */
export interface LinkRecord extends Link {
  /** Recent raw events, capped to keep storage bounded. */
  events: VisitEvent[];
  /** Daily aggregated buckets, always kept regardless of the event cap. */
  buckets: VisitBucket[];
}

/** Stats returned to the analytics dashboard for one link. */
export interface LinkStats {
  code: string;
  url: string;
  clicks: number;
  createdAt: string;
  expiresAt?: string;
  /** Daily series, oldest → newest, for charting. */
  series: { date: string; count: number }[];
  byCountry: Record<string, number>;
  byBrowser: Record<string, number>;
  byOs: Record<string, number>;
  byReferer: Record<string, number>;
  /** Number of raw events currently retained. */
  retainedEvents: number;
}

/** Result returned by the shorten endpoint. */
export interface ShortenResult {
  code: string;
  shortUrl: string;
  url: string;
  createdAt: string;
}

/** Shape of API errors. */
export interface ApiError {
  error: string;
}
