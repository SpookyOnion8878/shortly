/**
 * Pluggable persistence layer.
 *
 * `Store` is the contract the rest of the app depends on. Two implementations
 * are provided:
 *
 *  1. FileStore   — a JSON file at `.data/store.json`. Single process, good for
 *                   local dev and small self-hosted instances. Safe under
 *                   Node's cooperative single-threaded model because all writes
 *                   are serialised through an in-memory async queue.
 *  2. RedisStore  — Upstash Redis (HTTP, no open port required) for serverless
 *                   and multi-instance deployments. Enabled automatically when
 *                   UPSTASH_REDIS_REST_URL / _TOKEN are present.
 *
 * The app only ever imports `getStore()` — swapping backends is invisible to
 * the API and UI. This is the Dependency Inversion principle in practice.
 */

import { LINK_PREFIX, EVENT_CAP, RedisStore } from "./redis-store";
import { FileStore } from "./file-store";
import { USE_REDIS } from "./env";
import type { LinkRecord } from "./types";

export interface Store {
  /** Fetch a link record by code, or null if absent. */
  get(code: string): Promise<LinkRecord | null>;
  /** Insert a new link record (caller guarantees the code is unique). */
  insert(record: LinkRecord): Promise<void>;
  /** Overwrite an existing link record (used after a click increments stats). */
  update(record: LinkRecord): Promise<void>;
  /** List all link records, newest first. */
  list(): Promise<LinkRecord[]>;
  /** True when the code is already taken. */
  exists(code: string): Promise<boolean>;
}

let store: Store | null = null;

/** Returns the configured store singleton (Redis when configured, else file). */
export function getStore(): Store {
  if (store) return store;
  if (USE_REDIS) {
    store = new RedisStore();
  } else {
    store = new FileStore();
  }
  return store;
}

export { LINK_PREFIX, EVENT_CAP };
