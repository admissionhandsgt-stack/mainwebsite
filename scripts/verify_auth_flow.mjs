/**
 * End-to-end test of the sign-up flow, against a running server.
 *
 * Sends a real code to our own gateway number (messaging yourself is a normal
 * WhatsApp feature), reads it back out of the gateway's own chat history, and
 * redeems it — so every link in the chain is exercised for real: issue, send,
 * store, redeem, session, and the gate opening.
 *
 * Cleans up the rows it creates, because a test lead in the admin is a person
 * the team will try to call.
 *
 * Run: node scripts/verify_auth_flow.mjs [baseUrl]
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const BASE = process.argv[2] || "http://127.0.0.1:3100";
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

let pass = 0;
let fail = 0;
const ok = (what, detail = "") => {
  pass += 1;
  console.log(`  ✓ ${what}${detail ? ` — ${detail}` : ""}`);
};
const bad = (what, detail = "") => {
  fail += 1;
  console.log(`  ✗ ${what}${detail ? ` — ${detail}` : ""}`);
};

const cookies = new Map();
function remember(res) {
  for (const raw of res.headers.getSetCookie?.() ?? []) {
    const [pair] = raw.split(";");
    const i = pair.indexOf("=");
    cookies.set(pair.slice(0, i), pair.slice(i + 1));
  }
}
const cookieHeader = () =>
  [...cookies].map(([k, v]) => `${k}=${v}`).join("; ");

async function post(path, body) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookieHeader() },
    body: JSON.stringify(body),
  });
  remember(res);
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function get(path) {
  const res = await fetch(BASE + path, { headers: { Cookie: cookieHeader() } });
  remember(res);
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

async function main() {
  const [u] = await sql`SELECT value FROM integrations WHERE key = 'whatsapp.gateway.url'`;
  const [k] = await sql`SELECT value FROM integrations WHERE key = 'whatsapp.gateway.api_key'`;
  const [n] = await sql`SELECT value FROM integrations WHERE key = 'whatsapp.verify.number'`;
  const gateway = u.value.replace(/\/+$/, "");
  const apiKey = k.value;
  // The gateway stores the number with its country code; the site's own
  // `normalisePhone` wants the last ten. The chat id needs the full thing.
  const full = n.value.replace(/\D/g, "");
  const digits = full.slice(-10);
  const e164 = `+91${digits}`;

  console.log(`\nSigning up ${e164} against ${BASE}\n`);

  // Start from nothing, so the test always exercises the first-visit path.
  await sql`DELETE FROM users WHERE phone = ${e164}`;
  await sql`DELETE FROM otp_codes WHERE phone = ${e164}`;
  await sql`DELETE FROM leads WHERE phone = ${e164}`;

  /* -------------------------------------------------------------- lookup */
  const look = await post("/api/auth/lookup", { phone: digits });
  if (look.json.exists === false && look.json.hasPassword === false) {
    ok("lookup says the number is new", "so the flow sends a code");
  } else {
    bad("lookup", JSON.stringify(look.json));
  }

  /* ----------------------------------------------------------------- otp */
  const since = Math.floor(Date.now() / 1000) - 5;
  const sent = await post("/api/auth/otp", {
    phone: digits,
    name: "Flow Test",
    purpose: "signup",
    level: "pg",
    rank: 15000,
    category: "GEN",
  });

  if (sent.json.channel === "whatsapp") {
    ok("code sent over WhatsApp", `to ${sent.json.masked}`);
  } else if (sent.json.channel === "inbound") {
    bad("code sent over WhatsApp", `fell back to the inbound path: ${sent.json.note ?? ""}`);
  } else {
    bad("code sent", `${sent.status} ${JSON.stringify(sent.json)}`);
  }

  const [row] = await sql`
    SELECT sent_channel, attempts, consumed_at, code_hash
      FROM otp_codes WHERE phone = ${e164} ORDER BY created_at DESC LIMIT 1
  `;
  if (row?.sent_channel === "whatsapp") ok("row records the channel");
  else bad("row records the channel", JSON.stringify(row));
  if (row && !/^\d{6}$/.test(row.code_hash)) ok("the code itself is not stored", "only its HMAC");
  else bad("the code itself is not stored");

  /* ------------------------------------------- read the code back from WA */
  let code = null;
  for (let attempt = 0; attempt < 12 && !code; attempt += 1) {
    await new Promise((r) => setTimeout(r, 2000));
    const res = await fetch(
      `${gateway}/api/default/chats/${full}@c.us/messages?limit=8&downloadMedia=false`,
      { headers: { "X-Api-Key": apiKey } },
    );
    if (!res.ok) continue;
    const msgs = await res.json().catch(() => []);
    for (const m of Array.isArray(msgs) ? msgs : []) {
      const body = String(m.body ?? "");
      if ((m.timestamp ?? 0) < since) continue;
      if (!/AdmissionHands/i.test(body)) continue;
      const found = body.match(/\*(\d{6})\*/) ?? body.match(/\b(\d{6})\b/);
      if (found) code = found[1];
    }
  }

  if (code) ok("the message actually arrived", `code ${code[0]}•••••`);
  else bad("the message actually arrived", "could not read it back from the gateway");

  /* -------------------------------------------------------- wrong code */
  const wrong = await post("/api/auth/verify", {
    phone: digits,
    code: code === "000000" ? "111111" : "000000",
  });
  if (wrong.status === 400 && /not right/i.test(wrong.json.error ?? "")) {
    ok("a wrong code is rejected", wrong.json.error);
  } else {
    bad("a wrong code is rejected", `${wrong.status} ${JSON.stringify(wrong.json)}`);
  }

  const [counted] = await sql`
    SELECT attempts FROM otp_codes WHERE phone = ${e164} ORDER BY created_at DESC LIMIT 1
  `;
  if ((counted?.attempts ?? 0) >= 1) ok("the wrong guess was counted", `attempts = ${counted.attempts}`);
  else bad("the wrong guess was counted", JSON.stringify(counted));

  /* --------------------------------------------------------- right code */
  if (code) {
    const good = await post("/api/auth/verify", {
      phone: digits,
      code,
      name: "Flow Test",
      level: "pg",
      rank: 15000,
      category: "GEN",
    });
    if (good.status === 200 && good.json.signedIn) {
      ok("the right code signs them in", `hasPassword = ${good.json.hasPassword}`);
    } else {
      bad("the right code signs them in", `${good.status} ${JSON.stringify(good.json)}`);
    }
    if (cookies.has("ah_user")) ok("a session cookie was issued");
    else bad("a session cookie was issued");

    const [user] = await sql`SELECT verified_at, name, rank FROM users WHERE phone = ${e164}`;
    if (user?.verified_at) ok("the number is stored as verified");
    else bad("the number is stored as verified");
    if (user?.rank === 15000) ok("the search was remembered", `rank ${user.rank}`);
    else bad("the search was remembered", JSON.stringify(user));

    const [lead] = await sql`SELECT name, level, message FROM leads WHERE phone = ${e164}`;
    if (lead) ok("the enquiry reached the admin", lead.message);
    else bad("the enquiry reached the admin");

    /* ------------------------------------------------------ gate opens */
    const opened = await get("/api/predict?rank=15000&stream=pg&category=GEN");
    if (!opened.json.locked && (opened.json.results?.length ?? 0) > 0) {
      ok("the gate opens for a signed-in visitor", `${opened.json.results.length} seats`);
    } else {
      bad("the gate opens", `locked=${opened.json.locked} results=${opened.json.results?.length}`);
    }

    const reused = await post("/api/auth/verify", { phone: digits, code });
    if (reused.status === 400) ok("a code cannot be used twice", reused.json.error);
    else bad("a code cannot be used twice", `${reused.status}`);

    /* -------------------------------------------------------- password */
    const short = await post("/api/auth/password", { password: "abc" });
    if (short.status === 400) ok("a short password is refused", short.json.error);
    else bad("a short password is refused", `${short.status}`);

    const asPhone = await post("/api/auth/password", { password: digits });
    if (asPhone.status === 400) ok("the phone number is refused as a password", asPhone.json.error);
    else bad("the phone number is refused as a password", `${asPhone.status}`);

    const set = await post("/api/auth/password", { password: "counselling-2026" });
    if (set.status === 200) ok("the password is saved");
    else bad("the password is saved", `${set.status} ${JSON.stringify(set.json)}`);

    /* ------------------------------------------ and now the second visit */
    cookies.clear();

    const look2 = await post("/api/auth/lookup", { phone: digits });
    if (look2.json.hasPassword === true) {
      ok("a returning visitor is asked for the password", `greeted as ${look2.json.firstName}`);
    } else {
      bad("a returning visitor is asked for the password", JSON.stringify(look2.json));
    }

    const badPw = await post("/api/auth/login", { phone: digits, password: "wrong-one" });
    // The message must not say *which* half was wrong — "no such number" tells
    // an attacker which numbers are worth guessing passwords for.
    const tellsTooMuch = /no such|not registered|unknown number|wrong password|incorrect password/i;
    if (badPw.status === 401 && !tellsTooMuch.test(badPw.json.error ?? "")) {
      ok("a wrong password is rejected without saying which half", badPw.json.error);
    } else {
      bad("a wrong password is rejected", `${badPw.status} ${JSON.stringify(badPw.json)}`);
    }

    const login = await post("/api/auth/login", { phone: digits, password: "counselling-2026" });
    if (login.status === 200 && login.json.signedIn) {
      ok("password sign-in works with no phone in hand", `rank ${login.json.rank} remembered`);
    } else {
      bad("password sign-in works", `${login.status} ${JSON.stringify(login.json)}`);
    }

    const opened2 = await get("/api/predict?rank=15000&stream=pg&category=GEN");
    if (!opened2.json.locked) ok("the gate opens after a password sign-in");
    else bad("the gate opens after a password sign-in");
  }

  /* ------------------------------------------------------------- tidy up */
  await sql`DELETE FROM users WHERE phone = ${e164}`;
  await sql`DELETE FROM otp_codes WHERE phone = ${e164}`;
  await sql`DELETE FROM leads WHERE phone = ${e164}`;
  console.log("\n  (test rows removed)");

  console.log(`\n${pass} passed, ${fail} failed\n`);
  await sql.end();
  process.exit(fail ? 1 : 0);
}

main().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
