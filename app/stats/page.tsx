"use client";

import { useEffect, useState } from "react";
import { fetchLinks, copyToClipboard } from "@/lib/client";
import Link from "next/link";

interface LinkSummary {
  code: string;
  url: string;
  clicks: number;
  createdAt: string;
  expiresAt?: string;
  note?: string;
}

export default function StatsDashboard() {
  const [links, setLinks] = useState<LinkSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLinks()
      .then(setLinks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function copy(code: string) {
    const base =
      process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") ||
      window.location.origin;
    await copyToClipboard(`${base}/${code}`);
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your links</h1>
        <p className="text-sm text-slate-400">
          {links.length} link{links.length === 1 ? "" : "s"} · click any row to view analytics
        </p>
      </div>

      {loading && <p className="text-sm text-slate-400">Loading…</p>}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {!loading && !error && links.length === 0 && (
        <div className="card text-center text-sm text-slate-400">
          No links yet. Go to the{" "}
          <Link href="/" className="text-brand-300 underline">
            home page
          </Link>{" "}
          to create one.
        </div>
      )}

      <div className="space-y-2">
        {links.map((l) => (
          <div key={l.code} className="card flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/stats/${l.code}`}
                  className="font-mono text-sm text-brand-200 hover:underline"
                >
                  /{l.code}
                </Link>
                <button
                  onClick={() => copy(l.code)}
                  className="text-xs text-slate-500 hover:text-slate-300"
                >
                  copy
                </button>
              </div>
              <a
                href={l.url}
                target="_blank"
                rel="noreferrer"
                className="block truncate text-xs text-slate-400 hover:text-slate-200"
              >
                {l.url}
              </a>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold">{l.clicks}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">
                clicks
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
