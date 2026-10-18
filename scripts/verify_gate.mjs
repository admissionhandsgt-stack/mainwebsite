#!/usr/bin/env node
/**
 * Does a named college's closing rank reach anybody but staff?
 *
 *   node scripts/verify_gate.mjs https://www.admissionhands.com
 *   node scripts/verify_gate.mjs http://localhost:3100
 *
 * The rule since 2026-10-12 (lib/depth.ts): no visitor, no signed-in student
 * and no crawler sees a closing rank tied to a named college. A student who
 * signs in with a verified number gets their colleges in chance words —
 * high / good / possible / reach — with an approximate fee bracket, for a few
 * distinct ranks a day. A leak looks exactly like a working page, so this
 * asserts the rule from outside, the way a scraper would meet it:
 *
 *  1. No seat table on six page families, anonymous or spoofing a crawler.
 *  2. No page declares a paywall — there is nothing gated to declare.
 *  3. The old row APIs are gone, and the free answers are counts only.
 *  4. A verified session gets colleges, never a rank field, and a fourth
 *     distinct rank in a day is refused.
 *
 * It creates one verified user, then deletes it. Needs DATABASE_URL for that
 * last part only.
 */

import { config } from "dotenv";

config({ path: ".env.local" });

const base = (process.argv[2] ?? "http://localhost:8120").replace(/\/$/, "");

/** Pages that once carried a gated seat table. */
const PAGES = [
  "/md-ms-india/branches/md-general-medicine",
  "/md-ms-india/branches/md-radio-diagnosis",
  "/nri-quota/fees",
  "/management-quota",
  "/md-ms-india/colleges/sms-medical-college-jaipur",
  "/mbbs-india/colleges/a-j-institute-of-medical-sciences-research-centre-mangalore-ug",
];

/** Only the real seat table prints this header. */
const SEAT_TABLE = /R1 close/;
/** Only the locked panel prints this. */
const SUMMARY = /By quota/;
const GATED = /ah-gated-depth/;

const CRAWLER_UAS = [
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
];

let pass = 0;
let fail = 0;

const ok = (cond, label, extra = "") => {
  if (cond) pass++;
  else fail++;
  const mark = cond ? "\x1b[32mPASS\x1b[0m" : "\x1b[31mFAIL\x1b[0m";
  console.log(`  ${mark}  ${label}${extra ? `  ${extra}` : ""}`);
};

const head = (title) => console.log(`\n\x1b[1m${title}\x1b[0m`);

async function get(path, headers = {}) {
  const res = await fetch(`${base}${path}`, { headers, redirect: "manual" });
  return { status: res.status, body: await res.text() };
}

// ---------------------------------------------------------------- anonymous
// Since 2026-10-12 no closing rank for a named college reaches anybody but
// staff — not a visitor, not a signed-in student, not a crawler (lib/depth.ts).
head("An anonymous visitor gets no seat rows");
for (const path of PAGES) {
  const { status, body } = await get(path);
  if (status !== 200) {
    ok(false, path, `status ${status}`);
    continue;
  }
  const leaked = SEAT_TABLE.test(body);
  ok(!leaked && !GATED.test(body), path, leaked ? "SEAT ROWS ARE PUBLIC" : "");
}

// ------------------------------------------------------------------ spoofing
head("Claiming to be a crawler changes nothing");
for (const ua of CRAWLER_UAS) {
  const name = ua.includes("Googlebot") ? "Googlebot" : "bingbot";
  const plain = await get(PAGES[0], { "user-agent": ua });
  ok(!SEAT_TABLE.test(plain.body), `${name} user-agent alone gets no rows`);
  const forged = await get(PAGES[0], { "user-agent": ua, "x-forwarded-for": "66.249.66.1" });
  ok(!SEAT_TABLE.test(forged.body), `${name} + forged X-Forwarded-For gets no rows`);
}

// ----------------------------------------------------------------- declared
// Nothing differs between a crawler and a visitor any more, so nothing may be
// declared as gated — a paywall declaration over content nobody can reach
// describes a page that does not exist.
head("No page declares a paywall");
for (const path of PAGES) {
  const { status, body } = await get(path);
  if (status !== 200) continue;
  const blocks = [...body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)]
    .flatMap((m) => { try { const j = JSON.parse(m[1]); return Array.isArray(j) ? j : [j]; } catch { return []; } });
  ok(!blocks.some((b) => b && b.isAccessibleForFree === false), `${path} declares nothing gated`);
}

// --------------------------------------------------------------------- APIs
head("The row APIs are gone");
for (const api of [
  "/api/seat-rows?kind=branch&slug=md-general-medicine&category=GEN",
  "/api/college-cutoffs?slug=sms-medical-college-jaipur&level=pg",
]) {
  const res = await fetch(`${base}${api}`);
  ok(res.status === 404, `${api.split("?")[0]} -> 404`, `got ${res.status}`);
}

/** Any field that carries a closing rank, anywhere in a response. */
const RANK_KEYS = /"(firstRoundRank|widestRank|previousYearRank|furthestEver|r1Latest|widestLatest|r1|widest|closing_rank)"\s*:\s*\d/;

head("Anonymous answers are counts only");
{
  const p = await (await fetch(`${base}/api/predict?rank=25000&stream=pg&category=GEN`)).json();
  ok(p.total > 0 && p.options === null && p.results.length === 0, "/api/predict: counts, no colleges", `total:${p.total}`);
  ok(!RANK_KEYS.test(JSON.stringify(p)), "/api/predict carries no rank field");
  const r = await (await fetch(`${base}/api/rounds?rank=25000&stream=pg&category=GEN`)).json();
  ok(r.opened?.length === 0 && r.tightened?.length === 0, "/api/rounds: totals only", `opened:${r.openedTotal}`);
  const b = await (await fetch(`${base}/api/college-bands?rank=25000&level=pg&category=GEN`)).json();
  ok(b.bands === null && b.counts, "/api/college-bands: counts, no colleges");
}

// ------------------------------------------------------------ signed in
head("A verified student gets chances, never ranks");
if (!process.env.DATABASE_URL) {
  console.log("  SKIP  no DATABASE_URL — steps above still stand");
} else {
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const phone = `9${String(Math.floor(700000000 + Math.random() * 99999999)).slice(0, 9)}`;
  // 32 bytes: userAuth.ts rejects anything that is not 64 hex characters.
  const sessionId = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  let userId = null;
  try {
    const [user] = await sql`
      INSERT INTO users (phone, name, verified_at)
      VALUES (${phone}, 'Gate check', now())
      RETURNING id`;
    userId = user.id;
    await sql`
      INSERT INTO user_sessions (id, user_id, expires_at)
      VALUES (${sessionId}, ${user.id}, now() + interval '10 minutes')`;

    const cookie = `ah_user=${sessionId}`;
    for (const path of PAGES) {
      const { status, body } = await get(path, { cookie });
      ok(status === 200 && !SEAT_TABLE.test(body), `${path} shows no seat table, signed in`);
    }
    const p = await (await fetch(`${base}/api/predict?rank=25000&stream=pg&category=GEN`, { headers: { cookie } })).json();
    ok(Array.isArray(p.options) && p.options.length > 0, "/api/predict gives colleges", `colleges:${p.options?.length}`);
    ok(p.results.length === 0 && !RANK_KEYS.test(JSON.stringify(p)), "…in chance words, with no rank field");
    const r = await (await fetch(`${base}/api/rounds?rank=25000&stream=pg&category=GEN`, { headers: { cookie } })).json();
    ok(r.opened?.length === 0, "/api/rounds still gives totals only");
    const b = await (await fetch(`${base}/api/college-bands?rank=25000&level=pg&category=GEN`, { headers: { cookie } })).json();
    ok(Array.isArray(b.bands?.safe), "/api/college-bands names colleges for a verified account");
    for (const rk of [26000, 27000]) await fetch(`${base}/api/predict?rank=${rk}&stream=pg&category=GEN`, { headers: { cookie } });
    const fourth = await fetch(`${base}/api/predict?rank=28000&stream=pg&category=GEN`, { headers: { cookie } });
    ok(fourth.status === 429, "a fourth distinct rank in a day is refused", `got ${fourth.status}`);
  } finally {
    // Always, so a failed run does not leave a live session behind.
    if (userId) await sql`DELETE FROM chance_queries WHERE user_id = ${userId}`;
    await sql`DELETE FROM user_sessions WHERE id = ${sessionId}`;
    await sql`DELETE FROM users WHERE phone = ${phone}`;
    await sql.end();
  }
}

console.log(
  `\n\x1b[1m${pass} passed, ${fail} failed\x1b[0m` +
    (fail ? "\n\nA failure in the first sections means seat data is public.\n" : "\n"),
);
process.exit(fail ? 1 : 0);
