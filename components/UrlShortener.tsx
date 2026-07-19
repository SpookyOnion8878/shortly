"use client";

import { useState } from "react";
import { createLink, copyToClipboard } from "@/lib/client";

export default function UrlShortener() {
  const [url, setUrl] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setCopied(false);
    setLoading(true);
    try {
      const res = await createLink({
        url,
        customCode: customCode.trim() || undefined,
        expiresAt: expiresAt || undefined
      });
      setResult(res.shortUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function onCopy() {
    if (!result) return;
    const ok = await copyToClipboard(result);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <div className="card animate-fade-in">
      <form onSubmit={onSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            Long URL
          </label>
          <input
            className="input"
            type="url"
            required
            placeholder="https://example.com/some/very/long/path"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Custom code (optional)
            </label>
            <input
              className="input"
              type="text"
              placeholder="my-link"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-400">
              Expires at (optional)
            </label>
            <input
              className="input"
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
        </div>

        <button className="btn-primary w-full" type="submit" disabled={loading}>
          {loading ? "Shortening…" : "Shorten URL"}
        </button>
      </form>

      {error && (
        <p className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-brand-500/30 bg-brand-500/10 px-3 py-2">
          <a
            href={result}
            className="flex-1 truncate text-sm font-medium text-brand-200 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {result}
          </a>
          <a href={`/stats/${result.split("/").pop()}`} className="btn-ghost text-xs">
            Stats
          </a>
          <button onClick={onCopy} className="btn-ghost text-xs">
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
