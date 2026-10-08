/**
 * Admission Hands in-country edge — a Cloudflare Pages project (advanced mode)
 * in front of the Oracle Mumbai origin. Same pattern as KÓSMAE's.
 *
 * Why: admissionhands.com is on Cloudflare's Free plan, whose addresses Indian
 * ISPs route abroad (Airtel → Marseille, measured colo=MRS, 0.70 s to first
 * byte for a page the app renders in 54 ms). *.pages.dev, and a DNS-only custom
 * domain on it, is answered in-country (DEL/BOM/MAA).
 *
 * What runs here: only HTML, RSC, /api and images. _next/static and the public
 * files are uploaded with the project and served by Pages without invoking this
 * worker (_routes.json) — they are free and unlimited, worker requests are not
 * (Workers Free: 100,000 a day).
 *
 * What is cached: nothing personal, ever. Images (/_next/image, uploads) that
 * say `public` with a max-age; and pages for ANONYMOUS visitors only — the
 * locked page every logged-out visitor gets anyway (see cacheKind). Never
 * cached: /api, /admin, /account, /login, documents, RSC, any non-GET,
 * anything sent with a session cookie, any crawler, any response that sets a
 * cookie.
 *
 * The visitor's address: through this hop the origin would see the worker's.
 * The worker sends it as x-ah-client-ip with x-ah-edge-key (EDGE_SHARED_SECRET);
 * src/lib/clientIp.ts believes it only with that key. Visitor-sent x-ah-*
 * headers are deleted first.
 *
 * Env (Pages project settings): ORIGIN_URL = https://origin.admissionhands.com,
 * EDGE_SHARED_SECRET (secret). Rollback: point www back at the proxied A record
 * 137.23.39.214 (scripts/edge/README in deploy/edge).
 */
const CANONICAL = "www.admissionhands.com";
const FRESH_MS = 60 * 1000;
const STALE_MS = 7 * 24 * 60 * 60 * 1000;

const NEVER_PREFIX = ["/api", "/admin", "/account", "/login", "/cdn-cgi"];
const SESSION_COOKIES = ["ah_user=", "ah_unlock=", "ah_admin_session="];
// Kept in step with CRAWLER_UA in src/lib/crawler.ts: a verified crawler is
// served the gated rows, so nothing it receives may ever be stored.
const CRAWLER_UA = /(googlebot|google-inspectiontool|storebot-google|bingbot|adidxbot)/i;

function isImage(p) {
  return p === "/_next/image" || p.startsWith("/assets/images/uploads/");
}

/**
 * "image" | "html" | null. HTML is cached only for an anonymous document
 * request — the same rule the zone's "HTML for logged-out visitors" cache rule
 * applied to www before the edge (scripts/cf_html_cache.mjs): an anonymous
 * visitor always gets the same, locked page, so one copy serves all of them for
 * a minute. Signed in, unlocked or admin (any session cookie), a crawler (a
 * verified one is served the gated rows), an RSC request, /api and the private
 * paths all go to the origin every time.
 */
function cacheKind(request, url) {
  if (request.method !== "GET") return null;
  const p = url.pathname;
  if (NEVER_PREFIX.some((x) => p === x || p.startsWith(x + "/"))) return null;
  if (p.includes("/documents")) return null;
  const cookie = request.headers.get("cookie") || "";
  if (SESSION_COOKIES.some((c) => cookie.includes(c))) return null;
  if (CRAWLER_UA.test(request.headers.get("user-agent") || "")) return null;
  if (isImage(p)) return "image";
  const rsc = request.headers.get("rsc") === "1" || url.searchParams.has("_rsc") || request.headers.has("next-router-prefetch");
  if (rsc) return null;
  if (!(request.headers.get("accept") || "").includes("text/html")) return null;
  return "html";
}

/** A page is kept when it is a plain, cookie-free 200 of HTML. Its no-store is per-visitor intent the cookie test above already honours. */
function storableHtml(res) {
  return (
    res.status === 200 &&
    (res.headers.get("content-type") || "").includes("text/html") &&
    !res.headers.has("set-cookie")
  );
}

function storable(res) {
  const cc = (res.headers.get("cache-control") || "").toLowerCase();
  return (
    res.status === 200 &&
    cc.includes("public") &&
    /(s-maxage|max-age)=[1-9]/.test(cc) &&
    !cc.includes("private") &&
    !cc.includes("no-store") &&
    !res.headers.has("set-cookie")
  );
}

function originRequest(request, url, env) {
  const target = new URL(url.pathname + url.search, env.ORIGIN_URL);
  const h = new Headers(request.headers);
  for (const k of [...h.keys()]) if (k.startsWith("x-ah-")) h.delete(k); // never trust the visitor's own
  h.delete("host");
  h.set("x-ah-edge-key", env.EDGE_SHARED_SECRET);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) h.set("x-ah-client-ip", ip);
  const country = request.cf && request.cf.country;
  if (country) h.set("x-ah-country", String(country));
  const init = { method: request.method, headers: h, redirect: "manual" };
  if (request.method !== "GET" && request.method !== "HEAD") init.body = request.body;
  return new Request(target, init);
}

async function store(cache, key, res) {
  const h = new Headers(res.headers);
  h.set("x-edge-cc", res.headers.get("cache-control") || "");
  h.set("x-edge-stored", String(Date.now()));
  h.set("cache-control", `public, max-age=${STALE_MS / 1000}`);
  const body = await res.arrayBuffer(); // buffer: a streamed body that outlives the request can be cut off
  await cache.put(key, new Response(body, { status: res.status, headers: h }));
}

function toVisitor(res, state) {
  const h = new Headers(res.headers);
  h.set("cache-control", h.get("x-edge-cc") || "public, max-age=0");
  h.delete("x-edge-cc");
  h.delete("x-edge-stored");
  h.set("x-edge", state);
  return new Response(res.body, { status: res.status, headers: h });
}

const keep = (kind, res) => (kind === "html" ? storableHtml(res) : storable(res));
// Pages: fresh a minute, then served while the origin is asked again, for at
// most ten. Images: fresh a minute, kept a week (their names never change).
const STALE = { html: 10 * 60 * 1000, image: STALE_MS };

async function revalidate(kind, cache, key, cached, request, url, env) {
  const req = originRequest(request, url, env);
  const etag = cached.headers.get("etag");
  if (etag) req.headers.set("if-none-match", etag);
  const res = await fetch(req);
  if (res.status === 304) return store(cache, key, cached.clone());
  if (keep(kind, res)) return store(cache, key, res);
  // Gone, moved or now personal: drop the copy so the next visitor gets the real answer.
  return cache.delete(key);
}

/** The project's own *.pages.dev address must never be indexed beside www. */
function finish(res, url) {
  if (url.hostname !== CANONICAL) res.headers.set("x-robots-tag", "noindex");
  return res;
}

function passThrough(res, url) {
  const out = new Response(res.body, res);
  out.headers.set("x-edge", "PASS");
  return finish(out, url);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const kind = cacheKind(request, url);
    if (!kind) return passThrough(await fetch(originRequest(request, url, env)), url);

    const cache = caches.default;
    // One key space per kind, on the canonical host, so the pages.dev address
    // and www never share a copy.
    const key = new Request(`https://${url.hostname}/__${kind}${url.pathname}${url.search}`, { method: "GET" });
    const cached = await cache.match(key);
    if (cached) {
      const age = Date.now() - Number(cached.headers.get("x-edge-stored") || 0);
      if (age < FRESH_MS) return finish(toVisitor(cached, "HIT"), url);
      if (age < STALE[kind]) {
        ctx.waitUntil(revalidate(kind, cache, key, cached.clone(), request, url, env).catch(() => {}));
        return finish(toVisitor(cached, "STALE"), url);
      }
    }
    const res = await fetch(originRequest(request, url, env));
    if (keep(kind, res)) ctx.waitUntil(store(cache, key, res.clone()));
    const out = new Response(res.body, res);
    out.headers.set("x-edge", "MISS");
    return finish(out, url);
  },
};
