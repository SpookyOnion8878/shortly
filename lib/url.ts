/**
 * URL validation, normalisation and SSRF protection.
 *
 * Shorteners are a classic SSRF (Server-Side Request Forgery) vector: if an
 * attacker can store a link to an internal address (e.g. http://169.254.169.254/
 * on cloud metadata endpoints, or http://localhost:6379 for Redis), they can
 * use your public service to probe internal infrastructure. We defend against
 * this by (a) only allowing http/https, (b) requiring a real hostname, and
 * (c) resolving hostnames and rejecting private/loopback/link-local ranges
 * when BLOCK_PRIVATE_TARGETS is enabled.
 */

import { BLOCK_PRIVATE_TARGETS } from "./env";

/** Hostnames used by AWS/GCP/Azure/LocalStack metadata services. */
const METADATA_HOSTS = new Set([
  "169.254.169.254",
  "metadata.google.internal",
  "metadata",
  "fd00:ec2::254"
]);

/** Reject obviously invalid or unsupported schemes up front. */
function schemeAllowed(raw: string): boolean {
  return /^https?:\/\//i.test(raw);
}

/**
 * Decide whether an IP address is "private" and therefore unsafe to shorten
 * when the SSRF guard is on.
 *
 * Covers: loopback (127/::1), private RFC1918 (10/172.16-31/192.168),
 * link-local (169.254), CGNAT (100.64), and unique-local IPv6 (fc/fd).
 */
function isPrivateIp(ip: string): boolean {
  // IPv6
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    if (v === "::1" || v.startsWith("fc") || v.startsWith("fd")) return true;
    return false;
  }
  // IPv4
  const parts = ip.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255))
    return true; // malformed → treat as unsafe
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local / metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

export interface ValidateResult {
  ok: boolean;
  url?: string;
  reason?: string;
}

/**
 * Validate and normalise a user-supplied target URL.
 *
 * @param raw The raw input string.
 * @returns A {@link ValidateResult}; on success `url` is the trimmed,
 *          normalised absolute URL.
 */
export async function validateUrl(raw: string): Promise<ValidateResult> {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    return { ok: false, reason: "URL is required." };
  }

  const trimmed = raw.trim();
  if (!schemeAllowed(trimmed)) {
    return {
      ok: false,
      reason: "Only http:// and https:// URLs are allowed."
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { ok: false, reason: "Malformed URL." };
  }

  if (!parsed.hostname) {
    return { ok: false, reason: "URL must include a hostname." };
  }

  // Reject credentials in the URL (e.g. http://user:pass@host) — often abuse.
  if (parsed.username || parsed.password) {
    return { ok: false, reason: "URLs with embedded credentials are not allowed." };
  }

  if (BLOCK_PRIVATE_TARGETS) {
    const host = parsed.hostname.toLowerCase();
    if (METADATA_HOSTS.has(host)) {
      return { ok: false, reason: "Target points to a cloud metadata service." };
    }
    // If the host is a literal IP, check it directly.
    if (/^[\d.]+$/.test(host) || host.includes(":")) {
      if (isPrivateIp(host)) {
        return { ok: false, reason: "Target resolves to a private/internal address." };
      }
    } else {
      // Resolve the hostname to guard against DNS-rebinding style tricks.
      try {
        const { lookup } = await import("node:dns/promises");
        const records = await lookup(host, { all: true });
        for (const r of records) {
          if (isPrivateIp(r.address)) {
            return {
              ok: false,
              reason: "Target resolves to a private/internal address."
            };
          }
        }
      } catch {
        // DNS failure → refuse rather than risk it.
        return { ok: false, reason: "Could not resolve target hostname." };
      }
    }
  }

  // Canonicalise: drop a trailing dot on the host, keep everything else.
  const canonical = new URL(parsed.href);
  if (canonical.hostname.endsWith(".")) {
    canonical.hostname = canonical.hostname.slice(0, -1);
  }
  return { ok: true, url: canonical.href };
}
