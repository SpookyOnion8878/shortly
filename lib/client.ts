/**
 * Tiny client-side fetch helpers so components don't repeat boilerplate.
 */

import type { LinkStats, ShortenResult } from "./types";

export async function createLink(input: {
  url: string;
  customCode?: string;
  expiresAt?: string;
  note?: string;
}): Promise<ShortenResult> {
  const res = await fetch("/api/shorten", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Failed to create link.");
  }
  return data as ShortenResult;
}

export async function fetchStats(code: string): Promise<LinkStats> {
  const res = await fetch(`/api/stats/${code}`, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || "Failed to load stats.");
  }
  return data as LinkStats;
}

export async function fetchLinks(): Promise<
  {
    code: string;
    url: string;
    clicks: number;
    createdAt: string;
    expiresAt?: string;
    note?: string;
  }[]
> {
  const res = await fetch("/api/links", { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Failed to load links.");
  return data.links ?? [];
}

/** Copy text to the clipboard with a graceful fallback for older browsers. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback: temporary textarea + execCommand.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
