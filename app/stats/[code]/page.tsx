"use client";

import { useEffect, useState } from "react";
import { fetchStats, copyToClipboard } from "@/lib/client";
import BarChart from "@/components/BarChart";
import type { LinkStats } from "@/lib/types";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function LinkStatsPage({
  params
}: {
  params: { code: string };
}) {
  const { code } = params;
  const [stats, setStats] = useState<LinkStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats(code)
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return <p className="text-sm text-slate-400">Loading analytics…</p>;
  }
  if (error || !stats) {
    return (
      <div className="card">
        <p className="text-sm text-red-300">{error || "Link not found."}</p>
        <a href="/" className="mt-2 inline-block text-sm text-brand-300 underline">
          ← Back home
        </a>
      </div>
    );
  }

  const base =
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") ||
    window.location.origin;
  const shortUrl = `${base}/${stats.code}`;

  return (
    <div className="space-y-5">
      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <a
            href={shortUrl}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-brand-200 hover:underline"
          >
            {shortUrl}
          </a>
          <button
            onClick={() => copyToClipboard(shortUrl)}
            className="btn-ghost text-xs"
          >
            Copy
          </button>
        </div>
        <a
          href={stats.url}
          target="_blank"
          rel="noreferrer"
          className="mt-1 block truncate text-xs text-slate-400 hover:text-slate-200"
        >
          → {stats.url}
        </a>
        <p className="mt-2 text-xs text-slate-500">
          Created {fmtDate(stats.createdAt)}
          {stats.expiresAt ? ` · expires ${fmtDate(stats.expiresAt)}` : ""}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total clicks" value={stats.clicks} />
        <Stat label="Countries" value={Object.keys(stats.byCountry).length} />
        <Stat label="Browsers" value={Object.keys(stats.byBrowser).length} />
        <Stat label="Retained events" value={stats.retainedEvents} />
      </div>

      <div className="card">
        <h2 className="mb-3 text-sm font-semibold text-slate-200">Clicks over time</h2>
        <BarChart data={stats.series} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Breakdown title="By country" data={stats.byCountry} />
        <Breakdown title="By browser" data={stats.byBrowser} />
        <Breakdown title="By operating system" data={stats.byOs} />
        <Breakdown title="By referrer" data={stats.byReferer} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-slate-500">
        {label}
      </div>
    </div>
  );
}

function Breakdown({
  title,
  data
}: {
  title: string;
  data: Record<string, number>;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  return (
    <div className="card">
      <h2 className="mb-3 text-sm font-semibold text-slate-200">{title}</h2>
      {entries.length === 0 ? (
        <p className="text-xs text-slate-500">No data yet.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map(([k, v]) => (
            <li key={k} className="text-xs">
              <div className="flex items-center justify-between">
                <span className="truncate text-slate-300">{k}</span>
                <span className="text-slate-500">{v}</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-white/5">
                <div
                  className="h-full rounded bg-brand-500"
                  style={{ width: `${(v / total) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
