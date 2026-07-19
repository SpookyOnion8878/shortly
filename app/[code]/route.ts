/**
 * GET /:code — the redirect endpoint.
 *
 * This is the hot path: every click on a short link hits this handler. It:
 *   1. Resolves the code (renders the 404 page if missing/expired).
 *   2. Records the click (best-effort; a failed analytics write still redirects).
 *   3. Issues a 307 (temporary) redirect so the destination can change later.
 *
 * A 307 is preferred over 301 because 301s are cached aggressively by browsers
 * and would prevent expiring or updating a link.
 */

import { NextRequest, NextResponse } from "next/server";
import { notFound } from "next/navigation";
import { resolveLink, registerClick } from "@/lib/shortener";

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  const code = params.code;

  let record;
  try {
    record = await resolveLink(code);
  } catch (err) {
    console.error("[redirect] resolve failed:", err);
    record = null;
  }

  if (!record) {
    // notFound() renders the nearest not-found.tsx (app/not-found.tsx) with a
    // proper 404 status, instead of bouncing the user to a non-existent route.
    notFound();
    return;
  }

  // Record the click without blocking the redirect on analytics storage.
  void registerClick(record, {
    userAgent: req.headers.get("user-agent"),
    country:
      req.headers.get("x-vercel-ip-country") ?? req.headers.get("cf-ipcountry"),
    referer: req.headers.get("referer")
  }).catch((err) => console.error("[redirect] analytics write failed:", err));

  return NextResponse.redirect(record.url, { status: 307 });
}
