/**
 * End-to-end test of the document vault, against a running server.
 *
 * These are identity documents, so the tests that matter are the ones about
 * who *cannot* read them. Two throwaway accounts are created directly in the
 * database, one uploads a file, and the other is used to prove it cannot be
 * reached — along with an anonymous caller and a guessed URL.
 *
 * Cleans up after itself: both accounts, their rows and their files.
 *
 * Run: node scripts/verify_documents.mjs [baseUrl]
 */

import postgres from "postgres";
import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { readdir } from "node:fs/promises";

config({ path: ".env.local" });

const BASE = (process.argv[2] || "http://127.0.0.1:3100").replace(/\/+$/, "");
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const STORE = process.env.DOCUMENT_STORE || ".data/documents";

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

async function main() {
  console.log(`\nDocument vault against ${BASE}\n`);

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

  /* ------------------------------------------------------- who may read it */
  if (docId) {
    const mine = await fetch(`${BASE}/api/documents/${docId}`, { headers: { Cookie: owner.cookie } });
    if (mine.status === 200) {
      const cd = mine.headers.get("content-disposition") ?? "";
      ok("the owner can download it", cd.startsWith("attachment") ? "as an attachment" : cd);
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
  }

  /* ------------------------------------------------ nothing is public */
  const [row] = await sql`
    SELECT stored_name FROM student_documents WHERE user_id = ${owner.id} LIMIT 1
  `;
  if (row) {
    for (const guess of [
      `/uploads/documents/${row.stored_name}`,
      `/assets/images/uploads/${row.stored_name}`,
      `/${row.stored_name}`,
    ]) {
      const res = await fetch(BASE + guess);
      if (res.status === 404) ok(`not served statically at ${guess.slice(0, 34)}…`);
      else bad(`not served statically at ${guess}`, `got ${res.status}`);
    }
  }

  /* -------------------------------------------- replacing removes the old */
  const before = (await sql`SELECT stored_name FROM student_documents WHERE user_id = ${owner.id} AND doc_type = 'photo-id'`)[0];
  await upload(owner.cookie, "photo-id", PNG, "better id.png", "image/png");
  const after = (await sql`SELECT stored_name FROM student_documents WHERE user_id = ${owner.id} AND doc_type = 'photo-id'`)[0];

  if (before && after && before.stored_name !== after.stored_name) {
    ok("re-uploading replaces rather than duplicates");
    try {
      const files = await readdir(STORE);
      if (!files.includes(before.stored_name)) ok("the replaced file is deleted from disk");
      else bad("the replaced file is deleted from disk", "the old file is still there");
    } catch {
      console.log("    (disk check skipped — store not readable from here)");
    }
  } else {
    bad("re-uploading replaces rather than duplicates");
  }

  const count = (await sql`SELECT count(*)::int n FROM student_documents WHERE user_id = ${owner.id}`)[0].n;
  if (count === 2) ok("one row per document type", `${count} rows for 2 types`);
  else bad("one row per document type", `${count} rows`);

  /* ------------------------------------------------------------ clean up */
  const leftovers = await sql`SELECT stored_name FROM student_documents WHERE user_id IN (${owner.id}, ${stranger.id})`;
  await sql`DELETE FROM users WHERE id IN (${owner.id}, ${stranger.id})`;
  let unlinked = 0;
  try {
    const { unlink } = await import("node:fs/promises");
    const path = await import("node:path");
    for (const l of leftovers) {
      await unlink(path.join(STORE, l.stored_name)).then(
        () => {
          unlinked += 1;
        },
        () => {},
      );
    }
  } catch {
    /* store not reachable from here */
  }

  if (unlinked === leftovers.length) {
    console.log("\n  (test accounts and files removed)");
  } else {
    // Running against a remote server: the rows are gone but the files are on
    // that box, so they are orphans now. Say so rather than leave them quietly.
    const stranded = leftovers.length - unlinked;
    console.log(
      `\n  (test accounts removed; ${stranded} file(s) left on the server — ` +
        "clear them from Admin -> Documents, which offers to when it finds any)",
    );
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
