/**
 * Request limiting for the public data endpoints.
 *
 * The closing-rank data is the product. `/api/predict` returns up to 300 fully
 * detailed seats per call and had no limit at all, so anyone could walk the
 * rank space and rebuild the dataset from a laptop. This does not make that
 * impossible — nothing served publicly can — it makes it slow enough to be
 * not worth doing, and visible when someone tries.
 *
 * **In memory, and that is now enough.** This was written for Cloudflare
 * Workers, where every isolate kept its own counter and the real ceiling was
 * therefore unknowable — a speed bump rather than a boundary. The app has
 * since moved to a single Node process behind Caddy on the VPS, so one map
 * sees every request and the configured number is the actual limit.
 *
 * Two things that follow: it resets on deploy, which is acceptable for a
 * window measured in minutes; and if the app is ever run as more than one
 * process, this silently becomes a per-process limit again. Anything that
 * changes the process model has to revisit this file.
 */

import { clientIp } from "@/lib/clientIp";
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/** Stops the map growing without bound when many addresses appear once. */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, b] of Array.from(buckets.entries())) {
    if (now > b.resetAt) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
}

/**
 * Counts one request against `key`.
 *
 * Returns rather than throws, so a caller can decide between refusing the
 * request and serving a reduced answer.
 */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);
  if (!existing || now >= existing.resetAt) {
    const resetAt = now + windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  const ok = existing.count <= limit;
  return {
    ok,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
    retryAfterSeconds: ok ? 0 : Math.ceil((existing.resetAt - now) / 1000),
  };
}

/**
 * Who to count against.
 *
 * `x-forwarded-for` is client-controlled, so the *first* entry is only
 * trustworthy behind a proxy that rewrites it — which is the deployment here.
 * Cloudflare's own `cf-connecting-ip` is preferred because it cannot be
 * spoofed by the client.
 */
export function clientKey(request: Request): string {
  // Not CF-Connecting-IP, not X-Real-IP, not the left-most forwarded hop: each
  // of those is written by the client, and believing them handed every caller
  // a fresh bucket per request. See src/lib/clientIp.ts.
  return clientIp(request) ?? "unknown";
}

/**
 * The common case in one line: count this request against its visitor and
 * scope, and hand back a ready 429 when they are over, else null.
 *
 * For the endpoints that had no limit until 2026-11-05. The numbers given are
 * well above what a person or a page does (a college page asks for a few media
 * keys; an open tab polls round status every ~90 s) — this is a ceiling for
 * scripts, not a quota for students.
 */
export function limitOr429(request: Request, scope: string, limit: number, windowMs = 60_000): Response | null {
  const r = rateLimit(`${scope}:${clientKey(request)}`, limit, windowMs);
  if (r.ok) return null;
  return new Response(JSON.stringify({ error: "Too many requests. Try again in a little while." }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...rateLimitHeaders(r, limit) },
  });
}

/** The headers a well-behaved client needs to back off on its own. */
export function rateLimitHeaders(r: RateLimitResult, limit: number): Record<string, string> {
  const h: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(r.remaining),
    "X-RateLimit-Reset": String(Math.ceil(r.resetAt / 1000)),
  };
  if (!r.ok) h["Retry-After"] = String(r.retryAfterSeconds);
  return h;
}
