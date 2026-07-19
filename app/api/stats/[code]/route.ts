/**
 * GET /api/stats/:code — aggregate analytics for a single link.
 *
 * Response:
 *   200 LinkStats
 *   404 { error }
 *   500 { error }
 */

import { NextRequest, NextResponse } from "next/server";
import { getStats } from "@/lib/shortener";

export async function GET(
  _req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const stats = await getStats(params.code);
    if (!stats) {
      return NextResponse.json({ error: "Link not found or expired." }, { status: 404 });
    }
    return NextResponse.json(stats, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
