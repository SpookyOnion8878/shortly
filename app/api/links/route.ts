/**
 * GET /api/links — list all links (management / dashboard feed).
 *
 * Returns an array of lightweight link summaries (without raw events) to keep
 * the payload small.
 */

import { NextResponse } from "next/server";
import { listLinks } from "@/lib/shortener";

export async function GET() {
  try {
    const records = await listLinks();
    const summaries = records.map((r) => ({
      code: r.code,
      url: r.url,
      clicks: r.clicks,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      note: r.note
    }));
    return NextResponse.json({ links: summaries });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
