/**
 * File-backed store. Data lives at `.data/store.json`.
 *
 * Design notes:
 *  - Writes are serialised through a promise chain (`writeQueue`) so concurrent
 *    requests can't interleave reads/modify/writes and corrupt the file.
 *  - The whole dataset is small for personal use, so a single JSON file is
 *    simpler and more transparent than SQLite, and trivially inspectable.
 *  - `.data/` is git-ignored so real data never lands in the repo.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { getBaseDir } from "./paths";
import type { LinkRecord } from "./types";
import type { Store } from "./db";

const DATA_DIR = path.join(getBaseDir(), ".data");
const FILE = path.join(DATA_DIR, "store.json");

interface FileShape {
  /** Map of short code → record. */
  links: Record<string, LinkRecord>;
}

async function readAll(): Promise<FileShape> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<FileShape>;
    return { links: parsed.links ?? {} };
  } catch (err: unknown) {
    // Missing or corrupt file → start fresh. A corrupt file in dev is not fatal.
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
      return { links: {} };
    }
    console.error("[file-store] failed to read, starting fresh:", err);
    return { links: {} };
  }
}

async function writeAll(shape: FileShape): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${FILE}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(shape), "utf8");
  // Atomic replace so a crash mid-write never leaves a half-written file.
  await fs.rename(tmp, FILE);
}

export class FileStore implements Store {
  // Serialise writes; reads can be concurrent.
  private writeQueue: Promise<unknown> = Promise.resolve();

  private enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.writeQueue.then(fn, fn);
    // Keep the chain alive even if `fn` rejects.
    this.writeQueue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  async get(code: string): Promise<LinkRecord | null> {
    const { links } = await readAll();
    return links[code] ?? null;
  }

  async insert(record: LinkRecord): Promise<void> {
    await this.enqueue(async () => {
      const shape = await readAll();
      shape.links[record.code] = record;
      await writeAll(shape);
    });
  }

  async update(record: LinkRecord): Promise<void> {
    await this.enqueue(async () => {
      const shape = await readAll();
      shape.links[record.code] = record;
      await writeAll(shape);
    });
  }

  async list(): Promise<LinkRecord[]> {
    const { links } = await readAll();
    return Object.values(links).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }

  async exists(code: string): Promise<boolean> {
    const { links } = await readAll();
    return Boolean(links[code]);
  }
}
