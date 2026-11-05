/**
 * Where to send somebody after they sign in, when the destination came from the URL.
 *
 * Import-free on purpose: the /login server page and the client `LoginFlow` both
 * use it, and one rule in one place is the point.
 *
 * The old check, `/^\/[^/]/`, let `/\evil.com` and `/<tab>/evil.com` through.
 * Browsers read a backslash as a slash and drop tabs, so both became
 * `//evil.com` — another site, reached from a link that looked like ours
 * (found 2026-11-05). So: no backslash or control character anywhere, resolve the
 * value against a placeholder origin, keep it only if it stayed on that origin,
 * and return the normalised path rather than the raw input (`/.//evil` normalises
 * to `//evil`, hence the last check).
 */
export function safeNext(next: unknown, fallback = "/account"): string {
  if (typeof next !== "string" || next === "" || /[\u0000-\u001f\u007f\\]/.test(next)) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  try {
    const base = "https://x.invalid";
    const u = new URL(next, base);
    const out = u.pathname + u.search + u.hash;
    return u.origin === base && out.startsWith("/") && !out.startsWith("//") ? out : fallback;
  } catch {
    return fallback;
  }
}
