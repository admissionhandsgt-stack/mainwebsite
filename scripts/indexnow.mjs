// Tell Bing (and Yandex, Naver, Seznam — every IndexNow engine) which pages
// changed, so they recrawl them instead of waiting to rediscover them.
//
// The key is public by design: it is the file public/<key>.txt, which the
// engines fetch to confirm the submission came from the site's owner. Cloudflare
// Crawler Hints would do the same automatically, but it cannot be switched on
// with an API token (error 10405), so this is the scriptable equivalent.
// Google does not take IndexNow — scripts/gsc.mjs submits the sitemap there.
//
//   node scripts/indexnow.mjs                 every URL in the sitemap (first run)
//   node scripts/indexnow.mjs --since 2026-10-07   only URLs whose lastmod is on/after
//   node scripts/indexnow.mjs /mbbs-india/karnataka /neet-college-predictor
//
// Submit what changed, not the whole site on every deploy: an engine that is
// told everything changed every day learns to ignore the pings.
import { readdirSync, readFileSync } from "node:fs";

const HOST = "www.admissionhands.com";
const BASE = `https://${HOST}`;

const keyFile = readdirSync("public").find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) throw new Error("No IndexNow key file (public/<32 hex>.txt).");
const key = readFileSync(`public/${keyFile}`, "utf8").trim();

const live = await fetch(`${BASE}/${keyFile}`);
if (!live.ok || (await live.text()).trim() !== key) {
  throw new Error(`${BASE}/${keyFile} does not serve the key yet — deploy first.`);
}

const args = process.argv.slice(2);
let urls;
if (args.length && !args[0].startsWith("--")) {
  urls = args.map((p) => (p.startsWith("http") ? p : BASE + p));
} else {
  const since = args[0] === "--since" ? args[1] : null;
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: m[1].match(/<loc>([^<]+)<\/loc>/)?.[1],
    lastmod: m[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1] ?? null,
  }));
  urls = entries
    .filter((e) => e.loc && (!since || (e.lastmod && e.lastmod.slice(0, 10) >= since)))
    .map((e) => e.loc.replace(/&amp;/g, "&"));
}

console.log(`Submitting ${urls.length} URLs to IndexNow…`);
// The protocol takes up to 10,000 URLs a request.
for (let i = 0; i < urls.length; i += 10_000) {
  const r = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key, keyLocation: `${BASE}/${keyFile}`, urlList: urls.slice(i, i + 10_000) }),
  });
  // 200 = accepted, 202 = accepted, key check pending. Anything else is a refusal.
  console.log(`  batch ${i / 10_000 + 1}: HTTP ${r.status} ${r.status === 200 || r.status === 202 ? "accepted" : await r.text()}`);
}
