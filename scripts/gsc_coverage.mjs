// Search Console URL Inspection for every sitemap URL — the honest index map (read-only, 2026-11-08).
//
//   node --env-file=.env.local scripts/gsc_coverage.mjs run [out.jsonl] [limit=1900]
//   node --env-file=.env.local scripts/gsc_coverage.mjs report [out.jsonl]
//
// `run` reads the sitemap index, skips URLs already in out.jsonl (so it resumes day after day) and inspects the rest,
// small page families first, until the limit or the API's quota (2,000 inspections a day per property) — then stops
// cleanly. Each line: url, coverage state, verdict, last crawl, Google's and our canonical, and how many referring
// pages Google knows. `report` groups the file by page family and lists the not-indexed pages with fewest referrers —
// the ones internal links help most. Needs GSC_SA_KEY (the service account's key file, outside the repo).
// This never requests indexing: the Indexing API is not for these pages, and the UI's "Request indexing" is by hand.
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { createSign } from "node:crypto";

const [cmd = "report", outArg, limitArg] = process.argv.slice(2);
const OUT = outArg ?? "D:/Admisson Hands/seo_data/gsc_coverage_2026-11.jsonl";
const LIMIT = Number(limitArg ?? 1900);
const SITE = "sc-domain:admissionhands.com";

const family = (u) => {
  const p = new URL(u).pathname;
  if (p === "/") return "home";
  if (/^\/mbbs-india\/colleges\/[^/]+$/.test(p)) return "MBBS college";
  if (/^\/md-ms-india\/colleges\/[^/]+$/.test(p)) return "PG college";
  if (/^\/md-ms-india\/branches\/[^/]+\/[^/]+$/.test(p)) return "PG branch × state";
  if (/^\/md-ms-india\/branches\/[^/]+$/.test(p)) return "PG branch";
  if (/^\/md-ms-india\/states\/[^/]+$/.test(p)) return "PG state";
  if (/^\/md-ms-india\/stipend\/[^/]+$/.test(p)) return "PG stipend state";
  if (/^\/mbbs-india\/[^/]+$/.test(p) && !/colleges|deemed/.test(p)) return "MBBS state";
  if (/^\/neet-ss\//.test(p)) return "NEET SS";
  if (/^\/neet-mds\//.test(p)) return "NEET MDS";
  if (/^\/neet-pg-counselling\//.test(p)) return "PG round";
  return "hub / other";
};
const ORDER = ["home", "hub / other", "PG round", "PG state", "PG stipend state", "MBBS state", "PG branch", "PG branch × state", "NEET SS", "NEET MDS", "PG college", "MBBS college"];

const done = () =>
  existsSync(OUT) ? readFileSync(OUT, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)) : [];

if (cmd === "report") {
  const rows = done();
  const by = new Map();
  for (const r of rows) {
    const f = family(r.url);
    const g = by.get(f) ?? { total: 0, states: new Map(), out: [] };
    g.total++;
    g.states.set(r.coverage, (g.states.get(r.coverage) ?? 0) + 1);
    if (!/indexed/i.test(r.coverage) || /not indexed/i.test(r.coverage)) g.out.push(r);
    by.set(f, g);
  }
  console.log(`${rows.length} URLs inspected (${OUT})\n`);
  for (const f of [...by.keys()].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))) {
    const g = by.get(f);
    const indexed = [...g.states.entries()].filter(([s]) => /indexed/i.test(s) && !/not indexed/i.test(s)).reduce((n, [, c]) => n + c, 0);
    console.log(`${f}: ${indexed}/${g.total} indexed — ${[...g.states.entries()].sort((a, b) => b[1] - a[1]).map(([s, c]) => `${s} ${c}`).join(" · ")}`);
  }
  const wrongCanon = rows.filter((r) => r.google && r.user && r.google !== r.user);
  console.log(`\nGoogle chose another canonical: ${wrongCanon.length}`);
  for (const r of wrongCanon.slice(0, 20)) console.log(`  ${r.url}\n    → ${r.google}`);
  console.log("\nNot indexed, fewest referring pages first (internal links help these most):");
  const out = rows.filter((r) => /not indexed|unknown/i.test(r.coverage) && family(r.url) !== "MBBS college" && family(r.url) !== "PG college");
  for (const r of out.sort((a, b) => (a.referrers ?? 0) - (b.referrers ?? 0)).slice(0, 60)) console.log(`  ${r.referrers ?? 0} ref · ${r.coverage} · ${r.url}`);
  process.exit(0);
}

if (cmd !== "run") {
  console.log("usage: gsc_coverage.mjs run [out.jsonl] [limit] | report [out.jsonl]");
  process.exit(1);
}

const key = JSON.parse(readFileSync(process.env.GSC_SA_KEY, "utf8"));
const b64 = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");
async function token() {
  const now = Math.floor(Date.now() / 1000);
  const h = b64({ alg: "RS256", typ: "JWT" });
  const c = b64({ iss: key.client_email, scope: "https://www.googleapis.com/auth/webmasters.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const s = createSign("RSA-SHA256").update(`${h}.${c}`).sign(key.private_key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${h}.${c}.${s}` }),
  });
  return (await r.json()).access_token;
}

const index = await (await fetch("https://www.admissionhands.com/sitemap.xml")).text();
let urls = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urls.some((u) => u.endsWith(".xml"))) {
  const kids = urls;
  urls = [];
  for (const k of kids) urls.push(...[...(await (await fetch(k)).text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
}
const have = new Set(done().map((r) => r.url));
const todo = urls
  .filter((u) => !have.has(u))
  .sort((a, b) => ORDER.indexOf(family(a)) - ORDER.indexOf(family(b)))
  .slice(0, LIMIT);
console.log(`sitemap ${urls.length} URLs; already inspected ${have.size}; this run ${todo.length}`);

let tok = await token();
let tokAt = Date.now();
let i = 0;
let stop = false;
async function worker() {
  while (!stop && i < todo.length) {
    const u = todo[i++];
    if (Date.now() - tokAt > 50 * 60e3) (tok = await token()), (tokAt = Date.now());
    const r = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
      method: "POST",
      headers: { authorization: `Bearer ${tok}`, "content-type": "application/json" },
      body: JSON.stringify({ inspectionUrl: u, siteUrl: SITE }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 429 || j.error?.status === "RESOURCE_EXHAUSTED") {
      console.log(`quota reached after ${i - 1} this run: ${j.error?.message ?? r.status}`);
      stop = true;
      break;
    }
    const s = j.inspectionResult?.indexStatusResult ?? {};
    appendFileSync(OUT, JSON.stringify({
      url: u, at: new Date().toISOString(), coverage: s.coverageState ?? j.error?.message ?? "?", verdict: s.verdict ?? null,
      crawl: s.lastCrawlTime ?? null, google: s.googleCanonical ?? null, user: s.userCanonical ?? null,
      referrers: (s.referringUrls ?? []).length, sitemap: (s.sitemap ?? []).length,
    }) + "\n");
    if (i % 200 === 0) console.log(`  ${i}/${todo.length}`);
  }
}
await Promise.all([worker(), worker(), worker()]);
console.log("finished this run");
