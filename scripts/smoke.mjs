/**
 * Everything that must be true about a running site, checked in one command.
 *
 * These are the checks that were run by hand after every change during the
 * 2026-09-22/23 work. Written down, they become a thing you run after a deploy
 * instead of a thing you remember to do.
 *
 *   node scripts/smoke.mjs                          # against localhost:3000
 *   node scripts/smoke.mjs https://admissionhands.com
 *
 * Exit code 0 when everything passes, 1 otherwise, so CI can use it.
 *
 * Deliberately black-box: it talks to the site over HTTP exactly as a visitor
 * would, with no access to the code or the database. A check that reaches into
 * internals can pass while the site is broken.
 */

const BASE = (process.argv[2] || "http://localhost:3000").replace(/\/+$/, "");

let passed = 0;
let failed = 0;
const failures = [];

const ok = (name, detail = "") => {
  passed++;
  console.log(`  \x1b[32mPASS\x1b[0m  ${name}${detail ? `  ${detail}` : ""}`);
};
const bad = (name, detail) => {
  failed++;
  failures.push(`${name} — ${detail}`);
  console.log(`  \x1b[31mFAIL\x1b[0m  ${name}  \x1b[31m${detail}\x1b[0m`);
};

/**
 * One request, retried twice.
 *
 * A dropped connection is not a failing site, and this suite is meant to be
 * trusted after a deploy — a check that cries wolf on a flaky hop teaches
 * people to ignore it. Three attempts with a short backoff; a site that is
 * genuinely down still fails all three.
 */
async function get(path, init = {}) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await fetch(BASE + path, { redirect: "manual", ...init });
    } catch (error) {
      last = error;
      await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
    }
  }
  throw last;
}

function section(title) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

/* ------------------------------------------------------------------ */

async function checkRoutes() {
  section("Pages answer");
  const routes = [
    "/", "/login", "/neet-college-predictor",
    "/neet-college-predictor?course=mbbs", "/neet-college-predictor?course=bds",
    "/mbbs-india", "/mbbs-india/colleges", "/mbbs-india/deemed-universities",
    "/md-ms-india", "/md-ms-india/colleges",
    "/nri-quota", "/nri-quota/colleges", "/nri-quota/documents",
    "/services", "/know-us", "/videos", "/neet-ug-process", "/terms",
    "/sitemap.xml", "/robots.txt",
  ];
  for (const r of routes) {
    const res = await get(r);
    if (res.status === 200) ok(r);
    else bad(r, `expected 200, got ${res.status}`);
  }

  // Signed out, the account page must send you to sign in rather than render.
  const acct = await get("/account");
  if (acct.status === 307 || acct.status === 302) ok("/account", "redirects when signed out");
  else bad("/account", `expected a redirect when signed out, got ${acct.status}`);
}

async function checkRedirects() {
  section("Removed pages redirect rather than 404");
  // The five routes the one tool replaced, plus the fees page. Each has to
  // land on the tool rather than 404, because they are what is in the index.
  const pairs = [
    ["/mbbs-india/predictor", "/neet-college-predictor?course=mbbs"],
    ["/md-ms-india/predictor", "/neet-college-predictor?course=pg"],
    ["/mbbs-india/rounds", "/neet-college-predictor?course=mbbs"],
    ["/md-ms-india/rounds", "/neet-college-predictor?course=pg"],
    ["/mbbs-india/cutoffs", "/neet-college-predictor?course=mbbs"],
    ["/md-ms-india/cutoffs", "/neet-college-predictor?course=pg"],
    ["/md-ms-india/fees", "/md-ms-india/colleges"],
  ];
  for (const [from, to] of pairs) {
    const res = await get(from);
    const loc = res.headers.get("location") ?? "";
    if ((res.status === 301 || res.status === 308) && loc.endsWith(to)) ok(from, `→ ${to}`);
    else bad(from, `expected a permanent redirect to ${to}, got ${res.status} → ${loc || "nothing"}`);
  }
}

async function checkSecurityHeaders() {
  section("Security headers");
  const res = await get("/");
  const required = {
    "content-security-policy": /default-src/,
    "strict-transport-security": /max-age=\d+/,
    "x-frame-options": /DENY|SAMEORIGIN/i,
    "x-content-type-options": /nosniff/i,
    "referrer-policy": /./,
    "permissions-policy": /./,
  };
  for (const [h, pattern] of Object.entries(required)) {
    const v = res.headers.get(h);
    if (v && pattern.test(v)) ok(h);
    else bad(h, v ? `unexpected value: ${v.slice(0, 40)}` : "missing");
  }
  if (res.headers.get("x-powered-by")) bad("x-powered-by", "present — it advertises the stack");
  else ok("x-powered-by", "absent");
}

async function checkGate() {
  section("The data gate holds");

  const res = await get("/api/predict?rank=5000&stream=pg&category=GEN");
  if (!res.ok) return bad("/api/predict", `got ${res.status}`);
  const body = await res.json();

  if (body.locked === true) ok("predictor is gated", `${body.results.length} of ${body.total} seats`);
  else bad("predictor is gated", "an anonymous request got the full list");

  if (body.results.length <= 3) ok("preview is small", `${body.results.length} seats`);
  else bad("preview is small", `${body.results.length} seats leaked before the gate`);

  const counts = body.counts ?? {};
  const sum = Object.values(counts).reduce((a, b) => a + b, 0);
  if (sum === body.total) ok("counts are free and complete", `${sum} seats counted`);
  else bad("counts are free and complete", `counts sum to ${sum} but total is ${body.total}`);

  // A forged cookie must not open anything.
  const forged = await get("/api/predict?rank=5000&level=pg&category=GEN", {
    headers: { Cookie: "ah_unlock=forged.signature" },
  });
  const fb = await forged.json();
  if (fb.locked === true) ok("forged unlock cookie rejected");
  else bad("forged unlock cookie rejected", "a made-up cookie opened the data");

  const cut = await get("/api/college-cutoffs?slug=sms-medical-college-jaipur&level=pg");
  if (cut.status === 401) ok("college cutoffs gated", "401 without access");
  else bad("college cutoffs gated", `expected 401, got ${cut.status}`);
}

async function checkAdminLocked() {
  section("Admin is closed");
  for (const r of ["/api/admin/whatsapp", "/api/admin/dashboard"]) {
    const res = await get(r);
    if (res.status === 401) ok(r, "401 without a session");
    else bad(r, `expected 401, got ${res.status}`);
  }
  // The inbound webhook is public, so it must refuse anything unsigned.
  const hook = await get("/api/whatsapp/inbound", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event: "message", payload: { from: "911@c.us", body: "ABCDEF" } }),
  });
  if (hook.status === 401) ok("/api/whatsapp/inbound", "refuses an unsigned webhook");
  else bad("/api/whatsapp/inbound", `expected 401 without a signature, got ${hook.status}`);
}

async function checkClaims() {
  section("No claim we cannot stand behind");
  const banned = [
    /95%\s*\+?\s*Success/i,
    /100%\s*Success/i,
    /Prediction Accuracy/i,
    /5-year cutoff/i,
    /250\+\s*(PG|medical)?\s*Colleg/i,
    /600\+\s*(medical\s*)?colleg/i,
    /guaranteed (admission|seat|result)/i,
  ];
  for (const path of ["/", "/md-ms-india", "/mbbs-india", "/services", "/know-us"]) {
    const html = await (await get(path)).text();
    const hits = banned.filter((re) => re.test(html)).map((re) => re.source);
    if (hits.length === 0) ok(path, "clean");
    else bad(path, `found: ${hits.join(", ")}`);
  }
}

async function checkSitemap() {
  section("Sitemap");
  const xml = await (await get("/sitemap.xml")).text();
  const count = (xml.match(/<url>/g) ?? []).length;

  if (count > 1000) ok("sitemap is populated", `${count.toLocaleString("en-IN")} URLs`);
  else bad("sitemap is populated", `only ${count} URLs — it may have been built against an empty database`);

  for (const dead of ["/cutoffs", "/md-ms-india/fees", "/login", "/account", "/admin"]) {
    if (xml.includes(dead)) bad("sitemap excludes " + dead, "it is listed");
    else ok("sitemap excludes " + dead);
  }

  const robots = await (await get("/robots.txt")).text();
  if (/Sitemap:/i.test(robots)) ok("robots points at the sitemap");
  else bad("robots points at the sitemap", "no Sitemap: line");
  if (/Disallow:\s*\/admin/i.test(robots)) ok("robots keeps crawlers out of /admin");
  else bad("robots keeps crawlers out of /admin", "not disallowed");
}

async function checkRealNumbers() {
  section("Numbers on the page come from the data");
  const html = await (await get("/md-ms-india")).text();
  // The real figures as of the UG/PG imports. A drift here means either the
  // data changed (fine, update this) or a hardcoded string crept back (not).
  if (/2,168/.test(html)) ok("PG college count is the real one", "2,168");
  else bad("PG college count is the real one", "2,168 not found on the PG page");
}

async function checkSectionsRender() {
  section("Data-driven sections actually render");
  // A section whose query fails does not fail the page. safe() turns the error
  // into an empty list, the component returns null, and the response is still
  // a 200. That is how the homepage's Top Medical Institutes vanished for a day
  // in October 2026 — 1,084 "Failed query" log lines, every status code green.
  // So look for the section itself, and for a college inside it.
  const html = await (await get("/")).text();
  if (/id="top-medical-institutes"/.test(html)) ok("homepage: Top Medical Institutes renders");
  else bad("homepage: Top Medical Institutes renders", "section missing — check the app log for 'Failed query'");
  const colleges = (html.match(/Medical College|Institute of Medical Sciences|AIIMS/g) || []).length;
  if (colleges >= 3) ok("homepage: lists colleges", `${colleges} college names in the HTML`);
  else bad("homepage: lists colleges", `only ${colleges} college names found`);
}

async function checkStaticFiles() {
  section("Static files answer");
  // Every page check passed for two days while the logo, the favicon and every
  // hero image under public/ answered 404 — pages render, images do not, and
  // nothing here looked at an image. So look at them, and at the CSS and JS the
  // homepage actually links to.
  const html = await (await get("/")).text();
  const linked = [...new Set(html.match(/\/_next\/static\/(?:css|chunks)\/[^"']+?\.(?:css|js)/g) || [])].slice(0, 4);
  for (const path of ["/favicon.ico", "/logo.png", "/icon-192.png", "/apple-touch-icon.png", "/assets/images/og/admissionhands-1200x630.jpg", "/assets/images/logos/logo.avif", ...linked]) {
    const res = await get(path);
    const type = res.headers.get("content-type") || "";
    if (res.status === 200 && !/text\/html/.test(type)) ok(path, type);
    else bad(path, `expected 200 and not HTML, got ${res.status} ${type}`);
  }
}

/* ------------------------------------------------------------------ */

async function main() {
  console.log(`\nSmoke test against \x1b[1m${BASE}\x1b[0m`);

  try {
    await get("/");
  } catch {
    console.error(`\n\x1b[31mCould not reach ${BASE} at all.\x1b[0m Is it running?\n`);
    process.exit(1);
  }

  for (const check of [
    checkRoutes,
    checkRedirects,
    checkSecurityHeaders,
    checkGate,
    checkAdminLocked,
    checkClaims,
    checkSitemap,
    checkRealNumbers,
    checkSectionsRender,
    checkStaticFiles,
  ]) {
    try {
      await check();
    } catch (error) {
      bad(check.name, `the check itself threw: ${error.message}`);
    }
  }

  console.log(
    `\n\x1b[1m${passed} passed, ${failed} failed\x1b[0m` +
      (failed ? `\n\n\x1b[31mFailures:\x1b[0m\n${failures.map((f) => "  · " + f).join("\n")}` : ""),
  );
  console.log();
  process.exit(failed ? 1 : 0);
}

main();
