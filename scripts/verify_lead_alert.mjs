/**
 * Proves a lead alert actually reaches WhatsApp.
 *
 * Submits a real enquiry through the public form endpoint and then reads the
 * resulting message back out of the gateway, so the whole chain is exercised:
 * form → row → alert → a message that exists on a phone.
 *
 * This test is the one that would have caught the bug it was written for. The
 * alert had been failing since go-live — three paid providers, none of them
 * configured — and every check up to this point passed, because the form
 * worked, the row was written and the admin list showed it. Only delivery was
 * broken, and nothing was looking at delivery.
 *
 * The alert is temporarily pointed at our own gateway number so the run does
 * not message a member of staff, and the real number is restored at the end
 * even if the test fails.
 *
 * Run: node scripts/verify_lead_alert.mjs [baseUrl]
 * Needs the gateway reachable — locally that means an SSH tunnel on 3001.
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const BASE = (process.argv[2] || "http://127.0.0.1:3100").replace(/\/+$/, "");
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

let pass = 0;
let fail = 0;
const ok = (w, d = "") => {
  pass += 1;
  console.log(`  ✓ ${w}${d ? ` — ${d}` : ""}`);
};
const bad = (w, d = "") => {
  fail += 1;
  console.log(`  ✗ ${w}${d ? ` — ${d}` : ""}`);
};

async function main() {
  const [gw] = await sql`SELECT value FROM integrations WHERE key = 'whatsapp.gateway.url'`;
  const [key] = await sql`SELECT value FROM integrations WHERE key = 'whatsapp.gateway.api_key'`;
  const [num] = await sql`SELECT value FROM integrations WHERE key = 'whatsapp.verify.number'`;
  if (!gw || !num) {
    console.error("The WhatsApp gateway is not configured — nothing to test.");
    await sql.end();
    process.exit(1);
  }

  const gateway = gw.value.replace(/\/+$/, "");
  const ourNumber = num.value.replace(/\D/g, "");

  const [contact] = await sql`SELECT id, lead_notification_phone FROM contact_info LIMIT 1`;
  const original = contact?.lead_notification_phone ?? null;

  console.log(`\nLead alert through ${BASE}\n`);

  const marker = `QA-${Date.now().toString(36).toUpperCase()}`;
  const phone = "9000000199";

  try {
    // Point alerts at our own number for the duration, so no member of staff
    // is messaged by a test.
    if (contact) {
      await sql`UPDATE contact_info SET lead_notification_phone = ${"+" + ourNumber} WHERE id = ${contact.id}`;
      ok("alerts temporarily pointed at our own number", `+${ourNumber}`);
    }

    // `getContactInfo` is cached, and the row just changed underneath it.
    await new Promise((r) => setTimeout(r, 1500));

    const since = Math.floor(Date.now() / 1000) - 5;

    const res = await fetch(`${BASE}/api/leads`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `Alert Test ${marker}`,
        phone,
        level: "pg",
        rank: 41912,
        preferred_branch: "MD Radiodiagnosis",
        message: "Automated delivery check.",
        source_page: "verify_lead_alert.mjs",
      }),
    });

    if (res.ok) ok("the form accepted the enquiry", `HTTP ${res.status}`);
    else bad("the form accepted the enquiry", `HTTP ${res.status} ${(await res.text()).slice(0, 120)}`);

    const [row] = await sql`
      SELECT id, name, phone FROM leads WHERE phone LIKE ${"%" + phone} ORDER BY created_at DESC LIMIT 1
    `;
    if (row) ok("the lead reached the database", `#${row.id} ${row.name}`);
    else bad("the lead reached the database");

    /* ---------------------- and now the part that was broken --------------- */
    let delivered = null;
    for (let attempt = 0; attempt < 12 && !delivered; attempt += 1) {
      await new Promise((r) => setTimeout(r, 2000));
      const r = await fetch(
        `${gateway}/api/default/chats/${ourNumber}@c.us/messages?limit=8&downloadMedia=false`,
        { headers: key ? { "X-Api-Key": key.value } : {} },
      );
      if (!r.ok) continue;
      const msgs = await r.json().catch(() => []);
      for (const m of Array.isArray(msgs) ? msgs : []) {
        if ((m.timestamp ?? 0) < since) continue;
        if (String(m.body ?? "").includes(marker)) delivered = String(m.body);
      }
    }

    if (delivered) {
      ok("the alert arrived on WhatsApp", `${delivered.length} characters`);

      if (delivered.includes(phone)) ok("it carries the candidate's number", "the thing a counsellor needs");
      else bad("it carries the candidate's number", delivered.slice(0, 120));

      if (delivered.includes("41912")) ok("it carries the rank");
      else bad("it carries the rank");

      if (!/Not Specified|Not Provided/.test(delivered)) {
        ok("empty fields are left out", "no rows of 'Not Specified'");
      } else {
        bad("empty fields are left out", "still padding the message with placeholders");
      }

      console.log("\n--- what the team receives ---");
      console.log(
        delivered
          .split("\n")
          .map((l) => `    ${l}`)
          .join("\n"),
      );
      console.log("------------------------------");
    } else {
      bad("the alert arrived on WhatsApp", "nothing matching the marker showed up within 24s");
    }

    // The test's own lead is not a real enquiry.
    if (row) await sql`DELETE FROM leads WHERE id = ${row.id}`;
  } finally {
    if (contact) {
      await sql`UPDATE contact_info SET lead_notification_phone = ${original} WHERE id = ${contact.id}`;
      console.log(`\n  (alerts restored to ${original})`);
    }
  }

  console.log(`\n${pass} passed, ${fail} failed\n`);
  await sql.end();
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
