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
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return null;
  const hops = forwarded
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  return hops[hops.length - 1] ?? null;
}
