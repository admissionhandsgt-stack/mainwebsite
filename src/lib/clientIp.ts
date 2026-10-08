/**
 * The address of whoever is on the other end of this request, as far as this
 * app can trust anything.
 *
 * ## The rule
 *
 * The right-most X-Forwarded-For hop, and nothing else. Every other header a
 * request can carry is written by the client and believed by nobody.
 *
 * That holds because of what sits in front of the app, and only because of it:
 *
 * - Caddy is the only thing that can reach 127.0.0.1:8120.
 * - On www.admissionhands.com Caddy *replaces* X-Forwarded-For. A request that
 *   arrives from one of Cloudflare's published ranges gets Cloudflare's
 *   CF-Connecting-IP; anything else gets the address of the TCP peer. Either
 *   way it is one value, written by Caddy.
 * - On admin.admissionhands.com Caddy *appends*, so the right-most hop is the
 *   peer Caddy saw — whatever the client put in front of it is ignored here.
 *
 * ## Why this file exists
 *
 * Five places used to work this out four different ways. The rate limiter and
 * the error logger believed CF-Connecting-IP and X-Real-IP from anyone, and the
 * admin login and lead form believed the left-most X-Forwarded-For — which on
 * the admin host is whatever the client sent. So a forged header bought a fresh
 * rate-limit bucket on every request: the admin login's brute-force limit, the
 * OTP and unlock limits and the lead form's were all decorative. crawler.ts had
 * already been fixed for exactly this (a forged forwarded-for chain once got a
 * spoofed Googlebot the gated seat data), and the fix had not reached the rest.
 *
 * One function, used by all of them, so the rule cannot drift again.
 *
 * Null when there is no forwarded header at all — a request made to the app
 * directly on the box (the deploy's health check, the load test). Callers treat
 * that as one anonymous client, never as a reason to skip a check.
 */
/**
 * ## Behind the in-country edge (2026-10-08)
 *
 * www.admissionhands.com is served by a Cloudflare Pages worker
 * (deploy/edge/_worker.js) that reaches this app through
 * origin.admissionhands.com. Through that hop the forwarded address is the
 * worker's, not the visitor's — every student would share one rate-limit
 * bucket and Googlebot's reverse-DNS check would test a Cloudflare address.
 * So the worker sends the visitor's address as `x-ah-client-ip` together with
 * `x-ah-edge-key`, the shared secret (EDGE_SHARED_SECRET, in the app's env and
 * the Pages project's secrets, nowhere else). The header is believed **only**
 * when the key matches; the worker deletes any x-ah-* a visitor sent before
 * adding its own, and without the key the old rule below applies unchanged.
 */
const EDGE_SECRET = process.env.EDGE_SHARED_SECRET ?? "";

/** Constant-time string comparison that runs in any runtime. */
function sameSecret(given: string): boolean {
  if (EDGE_SECRET.length < 32 || given.length !== EDGE_SECRET.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ EDGE_SECRET.charCodeAt(i);
  return diff === 0;
}

const IP = /^[0-9a-f:.]{2,45}$/i;

/** True when this request came through our edge worker (the secret matched). */
export function viaEdge(request: Request): boolean {
  return sameSecret(request.headers.get("x-ah-edge-key") ?? "");
}

export function clientIp(request: Request): string | null {
  if (viaEdge(request)) {
    const edge = (request.headers.get("x-ah-client-ip") ?? "").trim();
    if (IP.test(edge)) return edge;
  }
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return null;
  const hops = forwarded
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  return hops[hops.length - 1] ?? null;
}
