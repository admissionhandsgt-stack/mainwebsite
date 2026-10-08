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
 * What is cached: nothing personal, ever. Every page answers `private,
 * no-store` (the seat gate decides per visitor), so pages always go to the
 * origin. Only responses that say `public` with a max-age, carry no Set-Cookie
 * and are images (/_next/image, uploaded images) are kept in the local
 * Cloudflare cache. Never cached: /api, /admin, /account, /login, documents,
 * any non-GET, anything sent with a session cookie, any crawler.
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

function cacheable(request, url) {
  if (request.method !== "GET") return false;
  const p = url.pathname;
  if (NEVER_PREFIX.some((x) => p === x || p.startsWith(x + "/"))) return false;
  if (p.includes("/documents")) return false;
  if (!isImage(p)) return false;
  const cookie = request.headers.get("cookie") || "";
  if (SESSION_COOKIES.some((c) => cookie.includes(c))) return false;
  if (CRAWLER_UA.test(request.headers.get("user-agent") || "")) return false;
  return true;
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

async function revalidate(cache, key, cached, request, url, env) {
  const req = originRequest(request, url, env);
  const etag = cached.headers.get("etag");
  if (etag) req.headers.set("if-none-match", etag);
  const res = await fetch(req);
  if (res.status === 304) return store(cache, key, cached.clone());
  if (storable(res)) return store(cache, key, res);
  if (res.status === 404 || res.status === 410) return cache.delete(key);
}

function passThrough(res, url) {
  const out = new Response(res.body, res);
  out.headers.set("x-edge", "PASS");
  // The project's own *.pages.dev address must never be indexed beside www.
  if (url.hostname !== CANONICAL) out.headers.set("x-robots-tag", "noindex");
  return out;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!cacheable(request, url)) return passThrough(await fetch(originRequest(request, url, env)), url);

    const cache = caches.default;
    const key = new Request(`https://${CANONICAL}${url.pathname}${url.search}`, { method: "GET" });
    const cached = await cache.match(key);
    if (cached) {
      const age = Date.now() - Number(cached.headers.get("x-edge-stored") || 0);
      if (age < FRESH_MS) return toVisitor(cached, "HIT");
      if (age < STALE_MS) {
        ctx.waitUntil(revalidate(cache, key, cached.clone(), request, url, env).catch(() => {}));
        return toVisitor(cached, "STALE");
      }
    }
    const res = await fetch(originRequest(request, url, env));
    if (storable(res)) ctx.waitUntil(store(cache, key, res.clone()));
    const out = new Response(res.body, res);
    out.headers.set("x-edge", "MISS");
    return out;
  },
};
