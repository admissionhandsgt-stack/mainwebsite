// Google Search Console from the command line, through a service account.
//
// Until 2026-10-08 the site had never been verified with Google at all — no
// Search Console property, so no sitemap submitted, no coverage report, and no
// way to see what Google thought of 3,630 pages. This does the whole setup
// without the web UI:
//
//   verify         get a DNS token, add it as a TXT record through Cloudflare,
//                  and verify the *domain* property (covers www, the apex, admin)
//   owner <email>  add a Google account as an owner, so the property appears in
//                  that person's own Search Console
//   add            add sc-domain:admissionhands.com to Search Console
//   sitemap        submit https://www.admissionhands.com/sitemap.xml
//   status         sitemaps as Google sees them, plus an inspection of key URLs
//   inspect <url>  one URL: indexed or not, last crawl, the canonical Google chose
//
// Key: GSC_SA_KEY in .env.local, a path to the service-account JSON — kept
// outside the repo. The account is search-console@admissionhands-seo-1008.
// Run: node --env-file=.env.local scripts/gsc.mjs <command>
//
// There is deliberately no "request indexing": Google's Indexing API is for job
// postings and livestreams only, and using it for anything else is against its
// terms. The sitemap is the supported way to tell Google about pages.
import { readFileSync } from "node:fs";
import { createSign } from "node:crypto";
import { cf, zone } from "./lib/cloudflare.mjs";

const DOMAIN = "admissionhands.com";
const SITE = `sc-domain:${DOMAIN}`;
const SITEMAP = "https://www.admissionhands.com/sitemap.xml";
const SCOPES = [
  "https://www.googleapis.com/auth/siteverification",
  "https://www.googleapis.com/auth/webmasters",
];

const keyPath = process.env.GSC_SA_KEY;
if (!keyPath) throw new Error("GSC_SA_KEY is not set (path to the service-account JSON).");
const key = JSON.parse(readFileSync(keyPath, "utf8"));

const b64url = (v) => Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString("base64url");

async function accessToken() {
  const now = Math.floor(Date.now() / 1000);
  const head = b64url({ alg: "RS256", typ: "JWT" });
  const claims = b64url({
    iss: key.client_email,
    scope: SCOPES.join(" "),
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });
  const sig = createSign("RSA-SHA256").update(`${head}.${claims}`).sign(key.private_key).toString("base64url");
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${head}.${claims}.${sig}`,
    }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`token: ${JSON.stringify(j)}`);
  return j.access_token;
}

const token = await accessToken();

async function google(method, url, body) {
  const r = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await r.text();
  const data = text ? JSON.parse(text) : {};
  if (!r.ok) throw new Error(`${method} ${url} -> ${r.status}: ${data.error?.message ?? text}`);
  return data;
}

const SV = "https://www.googleapis.com/siteVerification/v1";
const WM = "https://www.googleapis.com/webmasters/v3";
const site = { type: "INET_DOMAIN", identifier: DOMAIN };

async function verify() {
  const { token: txt } = await google("POST", `${SV}/token`, { site, verificationMethod: "DNS_TXT" });
  const z = await zone();
  const existing = await cf("GET", `/zones/${z.id}/dns_records?type=TXT&name=${DOMAIN}&per_page=100`);
  const has = (existing.result ?? []).some((d) => d.content.replace(/"/g, "") === txt);
  if (!has) {
    const r = await cf("POST", `/zones/${z.id}/dns_records`, {
      type: "TXT",
      name: DOMAIN,
      content: `"${txt}"`,
      ttl: 1,
      comment: "Google Search Console domain verification (scripts/gsc.mjs)",
    });
    if (!r.ok) throw new Error(`Cloudflare: ${JSON.stringify(r.errors)}`);
    console.log("  TXT record added; waiting for it to resolve…");
  } else {
    console.log("  TXT record already present");
  }
  // Google reads the record itself; give public resolvers a moment, then retry.
  for (let attempt = 1; attempt <= 12; attempt++) {
    try {
      const res = await google("POST", `${SV}/webResource?verificationMethod=DNS_TXT`, { site });
      console.log(`  verified: ${res.id}  owners: ${res.owners.join(", ")}`);
      return;
    } catch (e) {
      if (attempt === 12) throw e;
      await new Promise((r) => setTimeout(r, 10_000));
    }
  }
}

async function addOwner(email) {
  if (!email || !email.includes("@")) throw new Error("owner <email>");
  const id = encodeURIComponent(`dns://${DOMAIN}`);
  const res = await google("GET", `${SV}/webResource/${id}`);
  if (res.owners.includes(email)) return console.log(`  ${email} is already an owner`);
  const updated = await google("PUT", `${SV}/webResource/${id}`, { ...res, owners: [...res.owners, email] });
  console.log(`  owners: ${updated.owners.join(", ")}`);
}

async function add() {
  await google("PUT", `${WM}/sites/${encodeURIComponent(SITE)}`);
  const s = await google("GET", `${WM}/sites/${encodeURIComponent(SITE)}`);
  console.log(`  ${s.siteUrl}: ${s.permissionLevel}`);
}

async function sitemap() {
  await google("PUT", `${WM}/sites/${encodeURIComponent(SITE)}/sitemaps/${encodeURIComponent(SITEMAP)}`);
  console.log(`  submitted ${SITEMAP}`);
}

async function inspect(url) {
  const r = await google("POST", "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    inspectionUrl: url,
    siteUrl: SITE,
    languageCode: "en-IN",
  });
  const i = r.inspectionResult?.indexStatusResult ?? {};
  console.log(
    `  ${url}\n    ${i.verdict ?? "?"} · ${i.coverageState ?? "-"} · last crawl ${i.lastCrawlTime ?? "never"}` +
      (i.googleCanonical && i.googleCanonical !== url ? ` · Google's canonical ${i.googleCanonical}` : ""),
  );
}

async function status() {
  const s = await google("GET", `${WM}/sites/${encodeURIComponent(SITE)}/sitemaps`);
  for (const m of s.sitemap ?? []) {
    const c = (m.contents ?? []).map((x) => `${x.type} ${x.submitted} submitted / ${x.indexed ?? "?"} indexed`).join(", ");
    console.log(
      `  ${m.path}\n    last submitted ${m.lastSubmitted ?? "-"} · last read ${m.lastDownloaded ?? "not yet"} · ` +
        `${m.isPending ? "pending" : "processed"} · errors ${m.errors ?? 0} warnings ${m.warnings ?? 0}${c ? ` · ${c}` : ""}`,
    );
  }
  for (const u of [
    "https://www.admissionhands.com/",
    "https://www.admissionhands.com/neet-college-predictor",
    "https://www.admissionhands.com/mbbs-india/karnataka",
  ])
    await inspect(u);
}

const [cmd, arg] = process.argv.slice(2);
const run = { verify, owner: () => addOwner(arg), add, sitemap, status, inspect: () => inspect(arg) }[cmd];
if (!run) {
  console.log("usage: node --env-file=.env.local scripts/gsc.mjs verify|owner <email>|add|sitemap|status|inspect <url>");
  process.exit(1);
}
await run();
