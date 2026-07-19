/**
 * POST /api/shorten — create a short link.
 *
 * Request body (JSON):
 *   { "url": string, "customCode"?: string, "expiresAt"?: string, "note"?: string }
 *
 * Responses:
 *   200 { code, shortUrl, url, createdAt }
 *   400 { error }            — validation failure
 *   429 { error, retryAfterMs } — rate limited
 *   500 { error }            — internal failure
 */

import { NextRequest, NextResponse } from "next/server";
import { createShortLink } from "@/lib/shortener";
import { rateLimit } from "@/lib/rate-limiter";

function clientIp(req: NextRequest): string {
  // Honour common proxy headers; fall back to a constant in dev.
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "local";
}

export async function POST(req: NextRequest) {
  const limit = rateLimit(clientIp(req));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests, please slow down.", retryAfterMs: limit.retryAfterMs },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { url, customCode, expiresAt, note } = (body ?? {}) as Record<string, unknown>;

  if (typeof url !== "string") {
    return NextResponse.json({ error: "Field 'url' is required." }, { status: 400 });
  }

  try {
    const result = await createShortLink(url, {
      customCode: typeof customCode === "string" ? customCode : undefined,
      expiresAt: typeof expiresAt === "string" ? expiresAt : undefined,
      note: typeof note === "string" ? note : undefined
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    // Distinguish "taken" / validation style errors (400) from internal (500).
    const isClientError = /taken|invalid|characters|allocate|malformed|allowed|private|metadata/i.test(
      message
    );
    return NextResponse.json(
      { error: message },
      { status: isClientError ? 400 : 500 }
    );
  }
}
