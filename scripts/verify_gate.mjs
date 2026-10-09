#!/usr/bin/env node
/**
 * Does any seat-level detail reach somebody who has not signed in?
 *
 *   node scripts/verify_gate.mjs https://www.admissionhands.com
 *   node scripts/verify_gate.mjs http://localhost:8120      # through the tunnel
 *
 * The seat data is the product, and the gate on it is spread across a crawler
 * check, a JSON-LD declaration and six page families. Any one of them can be
 * undone by a change somewhere else, and nothing about the failure is visible
 * on the page — a leak looks exactly like a working page. So this asserts the
 * whole thing from outside, the way a scraper would meet it.
 *
 * Four things it proves, in the order they can go wrong:
 *
 *  1. An anonymous request gets the summary and no seat table.
 *  2. Claiming to be Googlebot changes nothing — including with a forged
 *     `X-Forwarded-For`, which is how the first run of this script caught a
 *     real hole (Caddy appends the peer, so the left-most hop is attacker text).
 *  3. Every page that gates something declares it. Serving a crawler more than
 *     a visitor without `isAccessibleForFree: false` is cloaking, and cloaking
 *     is the one SEO mistake that can deindex the site.
 *  4. A verified session does get the rows — a gate that never opens is just an
 *     outage.
 *
 * It creates one verified user, then deletes it. Needs DATABASE_URL for that
 * last part only; without it, steps 1–3 still run.
 */

import { config } from "dotenv";

config({ path: ".env.local" });

const base = (process.argv[2] ?? "http://localhost:8120").replace(/\/$/, "");

/** Pages that carry a gated seat table. */
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
head("An anonymous visitor gets the summary, never the rows");
for (const path of PAGES) {
  const { status, body } = await get(path);
  if (status !== 200) {
    ok(false, path, `status ${status}`);
    continue;
  }
  const leaked = SEAT_TABLE.test(body);
  ok(
    !leaked && SUMMARY.test(body) && GATED.test(body),
    path,
    leaked ? "SEAT ROWS ARE PUBLIC" : "",
  );
}

// ------------------------------------------------------------------ spoofing
head("Claiming to be a crawler proves nothing");
for (const ua of CRAWLER_UAS) {
  const name = ua.includes("Googlebot") ? "Googlebot" : "bingbot";

  const plain = await get(PAGES[0], { "user-agent": ua });
  ok(!SEAT_TABLE.test(plain.body), `${name} user-agent alone stays locked`);

  const forged = await get(PAGES[0], { "user-agent": ua, "x-forwarded-for": "66.249.66.1" });
  ok(!SEAT_TABLE.test(forged.body), `${name} + forged X-Forwarded-For stays locked`);

  const chain = await get(PAGES[0], {
    "user-agent": ua,
    "x-forwarded-for": "66.249.66.1, 66.249.64.2",
  });
  ok(!SEAT_TABLE.test(chain.body), `${name} + forged forwarded chain stays locked`);
}

// ----------------------------------------------------------------- declared
head("Every gated page declares the paywall");
for (const path of PAGES) {
  const { status, body } = await get(path);
  if (status !== 200) continue;
  const gated = GATED.test(body);
  // Both levels false, on the block that names the gated part: a `false`
  // anywhere on the page passed this while the page itself said `true`.
  const blocks = [...body.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/g)]
    .flatMap((m) => { try { const j = JSON.parse(m[1]); return Array.isArray(j) ? j : [j]; } catch { return []; } });
  const declared = blocks.some((b) => b && b.isAccessibleForFree === false && b.hasPart?.isAccessibleForFree === false);
  // A page with no gate needs no declaration; a gate with no declaration is
  // the dangerous combination, so that is what is asserted.
  ok(!gated || declared, `${path} declares isAccessibleForFree:false`, gated ? "" : "(no gate here)");
}

// --------------------------------------------------------------------- APIs
head("The depth APIs refuse an anonymous caller");
for (const api of [
  "/api/seat-rows?kind=branch&slug=md-general-medicine&category=GEN",
  "/api/seat-rows?kind=quota&family=nri&level=pg",
  "/api/seat-rows?kind=quota&family=management&level=pg",
  "/api/college-cutoffs?slug=sms-medical-college-jaipur&level=pg",
]) {
  const res = await fetch(`${base}${api}`);
  ok(res.status === 401, `${api.split("?")[0]} -> 401`, `got ${res.status}`);
}

// ------------------------------------------------------------- free answers
head("The free counts still answer");
for (const api of [
  "/api/predict?rank=25000&stream=pg&category=GEN",
  "/api/rounds?rank=25000&level=pg&category=GEN",
]) {
  const res = await fetch(`${base}${api}`);
  const json = await res.json().catch(() => null);
  const rows = (json?.seats ?? json?.results ?? json?.opened ?? []).length;
  ok(res.ok && rows === 0, `${api.split("?")[0]} answers with zero rows`, `rows:${rows}`);
}

// ------------------------------------------------------------ signed in
head("A verified session does get the rows");
if (!process.env.DATABASE_URL) {
  console.log("  SKIP  no DATABASE_URL — steps above still stand");
} else {
  const { default: postgres } = await import("postgres");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  // The gateway being paired turns on verificationRequired(), so a typed number
  // is not enough. Minting the session directly tests the gate rather than the
  // OTP flow, which verify_auth_flow.mjs already covers.
  const phone = `9${String(Math.floor(700000000 + Math.random() * 99999999)).slice(0, 9)}`;
  // 32 bytes: userAuth.ts rejects anything that is not 64 hex characters.
  const sessionId = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  try {
    const [user] = await sql`
      INSERT INTO users (phone, name, verified_at)
      VALUES (${phone}, 'Gate check', now())
      RETURNING id`;
    await sql`
      INSERT INTO user_sessions (id, user_id, expires_at)
      VALUES (${sessionId}, ${user.id}, now() + interval '10 minutes')`;

    const cookie = `ah_user=${sessionId}`;
    for (const path of PAGES) {
      const { status, body } = await get(path, { cookie });
      ok(status === 200 && SEAT_TABLE.test(body), `${path} shows the table`);
    }

    const res = await fetch(
      `${base}/api/seat-rows?kind=branch&slug=md-general-medicine&category=GEN`,
      { headers: { cookie } },
    );
    const json = await res.json().catch(() => ({}));
    const count = json.rows?.length ?? 0;
    ok(res.ok && count > 40, "/api/seat-rows returns the full list", `rows:${count}`);
  } finally {
    // Always, so a failed run does not leave a live session behind.
    await sql`DELETE FROM user_sessions WHERE id = ${sessionId}`;
    await sql`DELETE FROM users WHERE phone = ${phone}`;
    await sql.end();
  }
}

console.log(
  `\n\x1b[1m${pass} passed, ${fail} failed\x1b[0m` +
    (fail ? "\n\nA failure in the first two sections means the seat data is public.\n" : "\n"),
);
process.exit(fail ? 1 : 0);
