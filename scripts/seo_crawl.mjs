// A full on-page SEO crawl of every URL in the sitemap.
//
//   node scripts/seo_crawl.mjs [base] [--limit N] [--out file.json]
//
// Per page: status (no redirects), title (present, ≤ 65 chars, unique),
// description (70–160, unique), canonical (self, absolute, www), exactly one
// H1, no stray noindex, Open Graph title + image, JSON-LD that parses, images
// without alt, http:// links. Then every distinct internal link found is
// requested once (HEAD-ish GET) to find broken ones.
//
// Gentle by design: 6 at a time. Every request goes through the edge worker
// and counts against the Workers free 100k/day — a full run is ~4–8k.
import { writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const BASE = (args.find((a) => a.startsWith("http")) || "https://www.admissionhands.com").replace(/\/$/, "");
const LIMIT = Number(args[args.indexOf("--limit") + 1]) || Infinity;
const OUT = args.includes("--out") ? args[args.indexOf("--out") + 1] : null;
const UA = "Mozilla/5.0 (compatible; AdmissionHandsSEOCrawl/1.0; +https://www.admissionhands.com)";
const CONCURRENCY = 6;

const decode = (s) =>
  s
    ?.replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
const strip = (s) => decode(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { redirect: "manual", headers: { "user-agent": UA, accept: "text/html" }, signal: AbortSignal.timeout(30000) });
      return { status: r.status, location: r.headers.get("location"), robots: r.headers.get("x-robots-tag"), html: r.status === 200 ? await r.text() : "" };
    } catch (e) {
      if (attempt === 2) return { status: 0, error: String(e.cause?.code || e.message), html: "" };
      await new Promise((res) => setTimeout(res, 1500));
    }
  }
}

async function pool(items, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
        if ((k + 1) % 250 === 0) process.stderr.write(`  ${k + 1}/${items.length}\n`);
      }
    }),
  );
  return out;
}

function audit(url, res) {
  const h = res.html;
  const issues = [];
  const m = (re) => decode(h.match(re)?.[1]);
  const title = m(/<title[^>]*>([^<]*)<\/title>/);
  const desc = m(/<meta name="description" content="([^"]*)"/);
  const canonical = m(/<link rel="canonical" href="([^"]*)"/);
  const robotsMeta = m(/<meta name="robots" content="([^"]*)"/);
  const ogTitle = m(/<meta property="og:title" content="([^"]*)"/);
  const ogImage = m(/<meta property="og:image" content="([^"]*)"/);
  const h1s = [...h.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((x) => strip(x[1]));
  const imgs = [...h.matchAll(/<img\b[^>]*>/g)].map((x) => x[0]);
  const noAlt = imgs.filter((t) => !/\salt="[^"]+"/.test(t)).length;
  const ld = [...h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)];
  let ldBad = 0;
  const ldTypes = [];
  for (const x of ld) {
    try {
      const j = JSON.parse(x[1]);
      for (const o of j["@graph"] || (Array.isArray(j) ? j : [j])) ldTypes.push(o["@type"]);
    } catch {
      ldBad++;
    }
  }
  const httpLinks = [...h.matchAll(/href="(http:\/\/[^"]+)"/g)].map((x) => x[1]).filter((u) => !u.startsWith("http://www.w3.org"));
  const internal = [...new Set([...h.matchAll(/href="(\/[^"#?][^"#]*|\/)"/g)].map((x) => x[1].replace(/&amp;/g, "&")))];

  if (res.status !== 200) issues.push(`status ${res.status}${res.location ? ` → ${res.location}` : ""}`);
  else {
    if (!title) issues.push("no title");
    else if (title.length > 65) issues.push(`title ${title.length} chars`);
    if (!desc) issues.push("no description");
    else if (desc.length > 160) issues.push(`description ${desc.length} chars`);
    else if (desc.length < 70) issues.push(`description short (${desc.length})`);
    const self = url.replace(/\/$/, "");
    if (!canonical) issues.push("no canonical");
    else if (canonical.replace(/\/$/, "") !== self) issues.push(`canonical → ${canonical}`);
    if (h1s.length !== 1) issues.push(`${h1s.length} H1`);
    if (/noindex/i.test(robotsMeta || "") || /noindex/i.test(res.robots || "")) issues.push("noindex");
    if (!ogTitle) issues.push("no og:title");
    if (!ogImage) issues.push("no og:image");
    if (ldBad) issues.push(`${ldBad} JSON-LD unparseable`);
    if (noAlt) issues.push(`${noAlt} img without alt`);
    if (httpLinks.length) issues.push(`http link: ${httpLinks[0]}`);
  }
  return { url, status: res.status, title, desc, canonical, h1: h1s[0], ldTypes, bytes: h.length, issues, internal };
}

const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => decode(x[1])).slice(0, LIMIT);
console.error(`Crawling ${urls.length} sitemap URLs…`);
const pages = await pool(urls, async (u) => audit(u, await get(u)));

// Duplicates across the site.
const dup = (key) => {
  const seen = new Map();
  for (const p of pages) if (p[key]) seen.set(p[key], [...(seen.get(p[key]) || []), p.url]);
  return [...seen.entries()].filter(([, v]) => v.length > 1);
};
const dupTitles = dup("title");
const dupDescs = dup("desc");

// Every internal link once.
const inSitemap = new Set(urls.map((u) => u.replace(BASE, "") || "/"));
const linkTargets = [...new Set(pages.flatMap((p) => p.internal))].filter((l) => !l.startsWith("/_next") && !l.startsWith("/api/"));
const inbound = new Map();
for (const p of pages) for (const l of p.internal) inbound.set(l, (inbound.get(l) || 0) + 1);
console.error(`Checking ${linkTargets.length} distinct internal links…`);
const linkResults = await pool(linkTargets, async (l) => {
  if (inSitemap.has(l)) {
    const p = pages.find((x) => x.url.replace(BASE, "") === l || (l === "/" && x.url === BASE + "/"));
    if (p) return { link: l, status: p.status };
  }
  const r = await get(BASE + l);
  return { link: l, status: r.status, location: r.location };
});
const broken = linkResults.filter((r) => r.status >= 400 || r.status === 0);
const redirected = linkResults.filter((r) => r.status >= 300 && r.status < 400);
const orphans = [...inSitemap].filter((u) => !inbound.get(u) && u !== "/");

// Summary.
const tally = {};
for (const p of pages) for (const i of p.issues) {
  const k = i.replace(/\d+/g, "#").replace(/(→|:).*/, "$1");
  tally[k] = (tally[k] || 0) + 1;
}
console.log(`\n${pages.length} pages crawled · ${pages.filter((p) => p.status === 200).length} answered 200`);
console.log(`Pages with any issue: ${pages.filter((p) => p.issues.length).length}`);
for (const [k, v] of Object.entries(tally).sort((a, b) => b[1] - a[1])) console.log(`  ${String(v).padStart(5)}  ${k}`);
console.log(`Duplicate titles: ${dupTitles.length} groups · duplicate descriptions: ${dupDescs.length} groups`);
for (const [t, u] of dupTitles.slice(0, 5)) console.log(`  title "${t}" ×${u.length}: ${u.slice(0, 3).join(", ")}`);
for (const [t, u] of dupDescs.slice(0, 3)) console.log(`  desc ×${u.length}: ${u.slice(0, 3).join(", ")}`);
console.log(`Internal links: ${linkTargets.length} distinct · broken ${broken.length} · redirecting ${redirected.length}`);
for (const b of broken.slice(0, 10)) console.log(`  broken ${b.status}: ${b.link} (linked from ${inbound.get(b.link)} pages)`);
for (const r of redirected.slice(0, 10)) console.log(`  redirect ${r.status}: ${r.link} → ${r.location}`);
console.log(`Sitemap pages no crawled page links to: ${orphans.length}`);
for (const o of orphans.slice(0, 10)) console.log(`  orphan: ${o}`);
const worst = pages.filter((p) => p.issues.length).slice(0, 15);
for (const p of worst) console.log(`  ${p.url.replace(BASE, "")}: ${p.issues.join("; ")}`);
if (OUT) writeFileSync(OUT, JSON.stringify({ pages: pages.map(({ internal, ...p }) => p), dupTitles, dupDescs, broken, redirected, orphans }, null, 1));
