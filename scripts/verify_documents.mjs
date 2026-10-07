/**
 * End-to-end test of the document vault, against a running server.
 *
 * These are identity documents, so the tests that matter are the ones about
 * who *cannot* read them. Two throwaway accounts are created directly in the
 * database, one uploads a file, and the other is used to prove it cannot be
 * reached — along with an anonymous caller and a few guessed URLs.
 *
 * Cleans up completely: deleting the accounts cascades the rows, and since
 * migration 0015 the bytes are a column on those rows, so unlike a filesystem
 * store there is nothing that can be left behind.
 *
 * Run: node scripts/verify_documents.mjs [baseUrl]
 */

import postgres from "postgres";
import { config } from "dotenv";
import { randomBytes } from "node:crypto";

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

/** A session row straight in the database, so no OTP is needed to test this. */
async function makeUser(phone, name) {
  const [u] = await sql`
    INSERT INTO users (phone, name, verified_at) VALUES (${phone}, ${name}, now())
    ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
  `;
  const sid = randomBytes(32).toString("hex");
  await sql`
    INSERT INTO user_sessions (id, user_id, expires_at)
    VALUES (${sid}, ${u.id}, now() + interval '1 hour')
  `;
  return { id: u.id, cookie: `ah_user=${sid}` };
}

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n", "utf8");

async function upload(cookie, docType, bytes, filename, type) {
  const form = new FormData();
  form.append("docType", docType);
  form.append("file", new File([bytes], filename, { type }));
  const res = await fetch(`${BASE}/api/documents`, {
    method: "POST",
    headers: { Cookie: cookie },
    body: form,
  });
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

/*
 * An upload sends the counsellors a real WhatsApp alert ("New enquiry — Vault
 * Owner — Counselling documents"), so every run of this test used to message
 * the team about a candidate who does not exist: five times between 2026-10-04
 * and 10-06. For the length of the run the alerts go to our own gateway
 * number instead, and the real one is restored in a `finally`, even on a
 * failure — the same arrangement as verify_lead_alert.mjs.
 */
let contactId = null;
let originalAlertPhone = null;

async function redirectAlerts() {
  const [num] = await sql`SELECT value FROM integrations WHERE key = 'whatsapp.verify.number'`;
  const [contact] = await sql`SELECT id, lead_notification_phone FROM contact_info LIMIT 1`;
  const ours = String(num?.value ?? "").replace(/\D/g, "");
  if (!contact || ours.length < 10) {
    throw new Error("Cannot redirect alerts (no contact_info row or no gateway number) — not running, so the team is not messaged.");
  }
  contactId = contact.id;
  originalAlertPhone = contact.lead_notification_phone;
  await sql`UPDATE contact_info SET lead_notification_phone = ${"+" + ours} WHERE id = ${contactId}`;
  console.log(`  (alerts pointed at our own number for this run, not the team's)`);
}

async function restoreAlerts() {
  if (contactId === null) return;
  await sql`UPDATE contact_info SET lead_notification_phone = ${originalAlertPhone} WHERE id = ${contactId}`;
  console.log(`  (alerts restored to ${originalAlertPhone})`);
}

async function main() {
  console.log(`\nDocument vault against ${BASE}\n`);
  await redirectAlerts();

  const owner = await makeUser("+919000000101", "Vault Owner");
  const stranger = await makeUser("+919000000102", "Vault Stranger");

  /* ------------------------------------------------- anonymous is refused */
  const anonList = await fetch(`${BASE}/api/documents`);
  if (anonList.status === 401) ok("anonymous cannot list documents", "401");
  else bad("anonymous cannot list documents", `got ${anonList.status}`);

  const anonUp = await upload("", "photo-id", PNG, "x.png", "image/png");
  if (anonUp.status === 401) ok("anonymous cannot upload", "401");
  else bad("anonymous cannot upload", `got ${anonUp.status}`);

  /* ------------------------------------------------------ the happy path */
  const up = await upload(owner.cookie, "photo-id", PNG, "my id.png", "image/png");
  if (up.status === 200 && up.json.document?.id) ok("a signed-in candidate can upload");
  else bad("a signed-in candidate can upload", `${up.status} ${JSON.stringify(up.json)}`);

  const docId = up.json.document?.id;

  const pdf = await upload(owner.cookie, "mbbs-degree", PDF, "degree.pdf", "application/pdf");
  if (pdf.status === 200) ok("PDF is accepted");
  else bad("PDF is accepted", `${pdf.status} ${JSON.stringify(pdf.json)}`);

  /* ------------------------------------------- the filename proves nothing */
  const liar = await upload(
    owner.cookie,
    "class-10",
    Buffer.from("<?php system($_GET['c']); ?>", "utf8"),
    "cert.pdf",
    "application/pdf",
  );
  if (liar.status === 415) ok("a script renamed .pdf is refused", "decided by magic bytes");
  else bad("a script renamed .pdf is refused", `got ${liar.status}`);

  const zip = await upload(
    owner.cookie,
    "class-10",
    Buffer.from([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0, 0, 0, 0, 0]),
    "thing.zip",
    "application/zip",
  );
  if (zip.status === 415) ok("a bare zip is refused", "only Word's own type passes");
  else bad("a bare zip is refused", `got ${zip.status}`);

  /* ------------------------------------------------ the bytes are in the row */
  // The row holds the file *sealed*: AHD1 + 12-byte nonce + 16-byte GCM tag +
  // ciphertext (src/lib/documentCrypto.ts). This check used to compare the
  // stored length with the file's own, which stopped being true the day the
  // vault was encrypted — so it failed on every run and proved nothing. It now
  // checks the thing that matters: sealed, the right size, no plaintext.
  const SEAL = 4 + 12 + 16;
  const stored = (
    await sql`
      SELECT length(content) AS len, size_bytes, mime_type,
             encode(substring(content from 1 for 4), 'escape') AS magic,
             position(${PNG.subarray(1, 8)}::bytea in content) AS plain_at
        FROM student_documents WHERE user_id = ${owner.id} AND doc_type = 'photo-id'
    `
  )[0];
  if (
    stored &&
    stored.magic === "AHD1" &&
    Number(stored.len) === PNG.length + SEAL &&
    stored.size_bytes === PNG.length &&
    Number(stored.plain_at) === 0
  ) {
    ok("the file is stored in Postgres, sealed", `${stored.len} bytes: AHD1 + ${SEAL - 4} of nonce/tag + ciphertext, no plaintext`);
  } else {
    bad("the file is stored in Postgres, sealed", JSON.stringify(stored));
  }

  /* ------------------------------------------------------- who may read it */
  if (docId) {
    const mine = await fetch(`${BASE}/api/documents/${docId}`, { headers: { Cookie: owner.cookie } });
    if (mine.status === 200) {
      const cd = mine.headers.get("content-disposition") ?? "";
      const body = Buffer.from(await mine.arrayBuffer());
      ok("the owner can download it", cd.startsWith("attachment") ? "as an attachment" : cd);
      if (body.equals(PNG)) ok("the bytes come back unchanged", `${body.length} bytes`);
      else bad("the bytes come back unchanged", `${body.length} vs ${PNG.length}`);
      if (!cd.startsWith("attachment")) bad("served as an attachment", cd);
    } else {
      bad("the owner can download it", `got ${mine.status}`);
    }

    const theirs = await fetch(`${BASE}/api/documents/${docId}`, {
      headers: { Cookie: stranger.cookie },
    });
    if (theirs.status === 404) ok("another candidate cannot read it", "404, not 403");
    else bad("another candidate cannot read it", `got ${theirs.status}`);

    const anon = await fetch(`${BASE}/api/documents/${docId}`);
    if (anon.status === 404) ok("an anonymous caller cannot read it", "404");
    else bad("an anonymous caller cannot read it", `got ${anon.status}`);

    const del = await fetch(`${BASE}/api/documents/${docId}`, {
      method: "DELETE",
      headers: { Cookie: stranger.cookie },
    });
    if (del.status === 404) ok("another candidate cannot delete it", "404");
    else bad("another candidate cannot delete it", `got ${del.status}`);

    /* --------------------------------------------- nothing else serves them */
    // There is no path to guess any more, but a route that leaked them would
    // still be a leak, so the guesses stay.
    for (const guess of [
      `/uploads/documents/${docId}`,
      `/assets/images/uploads/${docId}`,
      `/api/documents/${docId}/raw`,
    ]) {
      const res = await fetch(BASE + guess);
      if (res.status === 404) ok(`nothing served at ${guess}`);
      else bad(`nothing served at ${guess}`, `got ${res.status}`);
    }
  }

  /* --------------------------------------------- replacing keeps one row */
  const before = (
    await sql`SELECT id FROM student_documents
               WHERE user_id = ${owner.id} AND doc_type = 'photo-id'`
  )[0];
  await upload(owner.cookie, "photo-id", PDF, "better id.pdf", "application/pdf");
  const after = (
    await sql`SELECT id, original_name, mime_type, length(content) AS len
                FROM student_documents WHERE user_id = ${owner.id} AND doc_type = 'photo-id'`
  )[0];

  if (before && after && before.id === after.id && after.original_name === "better id.pdf") {
    ok("re-uploading replaces in place", "same row, new contents");
  } else {
    bad("re-uploading replaces in place", JSON.stringify({ before, after }));
  }
  if (after && Number(after.len) === PDF.length + SEAL && after.mime_type === "application/pdf") {
    ok("the old bytes are gone", `${after.len} bytes, ${after.mime_type}`);
  } else {
    bad("the old bytes are gone", JSON.stringify(after));
  }

  const count = (
    await sql`SELECT count(*)::int n FROM student_documents WHERE user_id = ${owner.id}`
  )[0].n;
  if (count === 2) ok("one row per document type", `${count} rows for 2 types`);
  else bad("one row per document type", `${count} rows`);

  /* ------------------------------------------------------------ clean up */
  await sql`DELETE FROM users WHERE id IN (${owner.id}, ${stranger.id})`;
  const stray = (
    await sql`SELECT count(*)::int n FROM student_documents
               WHERE user_id IN (${owner.id}, ${stranger.id})`
  )[0].n;
  if (stray === 0) ok("deleting the account takes the documents with it", "nothing left behind");
  else bad("deleting the account takes the documents with it", `${stray} left`);

  console.log(`\n${pass} passed, ${fail} failed\n`);
  await restoreAlerts();
  await sql.end();
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await restoreAlerts().catch((err) => console.error("COULD NOT RESTORE THE ALERT NUMBER:", err));
  await sql.end();
  process.exit(1);
});
