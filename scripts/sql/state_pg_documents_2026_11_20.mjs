// /neet-pg-documents: three states' lists corrected line by line against their own 2026 documents (2026-11-20, owner:
// "documents required checklist … sahi se dekho kahi bhi kuch galti na ho").
//   Maharashtra — CET Cell brochure 12.2 xvi (the Dean's / Principal's letter also counts) and 12.4 Note 1 (the caste
//                 validity relaxations cover SEBC/OBC — six months, GR 02/07/2026 — and SC, VJ/DT-A, NT-B, NT-C, NT-D —
//                 three months, circular 04/09/2026 — not every category).
//   Rajasthan  — bulletin sections 13 and 15: the resignation applies only to a candidate studying now or holding another
//                 seat; originals with two sets of self-attested copies and a notarised Proforma-1 undertaking on a ₹50
//                 non-judicial stamp paper.
//   Gujarat    — Round 1 instructions: no NOC item exists; the NEET-PG mark sheet, passport and disability certificate are
//                 copies; the school leaving / transfer certificate is compulsory for all; the NRI deposit.
// Edits src/lib/pgDocuments.ts and the matching pg_documents_official rows, each only where the old line is still there.
//   node --env-file=.env.local scripts/sql/state_pg_documents_2026_11_20.mjs [--apply]
import fs from "node:fs";
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const EDITS = {
  "Maharashtra — State CET Cell": {
    body: [
      [
        "Selection letter for an MBBS taken through an all-India exam (All India Quota, AIIMS, central institutes)",
        "Selection letter for an MBBS taken through an all-India exam (All India Quota, AIIMS, central institutes), or the Dean's / Principal's letter that you were admitted under the 15% All India Quota",
      ],
    ],
    notes: [
      [
        "A reserved-category candidate without the caste validity certificate at registration is considered in the open category (relaxations issued on 2 Jul and 4 Sep 2026 allow later submission).",
        "A reserved-category candidate without the caste validity certificate at registration is considered in the open category. Relaxations: SEBC and OBC candidates may produce it up to six months from applying for it (GR of 2 Jul 2026); SC, VJ/DT-A, NT-B, NT-C and NT-D candidates up to three months from the circular of 4 Sep 2026 — otherwise the admission is cancelled.",
      ],
    ],
  },
  "Rajasthan — NEET PG Admission/Counselling Board 2026": {
    body: [
      ["Accepted resignation from your present institution, or from a college allotted in another counselling (including All India)\n", ""],
      ["## If they apply to you\nCaste and sub-category certificate valid for 2026-27", "## If they apply to you\nAccepted resignation, if you are studying now or hold a college from another counselling (including All India)\nCaste and sub-category certificate valid for 2026-27"],
    ],
    notes: [
      [
        "The internship must be complete on 30 September 2026; no condonation is accepted.",
        "Bring every original with two sets of self-attested copies and an undertaking in Proforma-1, on a ₹50 non-judicial stamp paper, notarised, that the documents are original — without them the admission is cancelled.\nThe internship must be complete on 30 September 2026; no condonation is accepted.",
      ],
    ],
  },
  "Gujarat — ACPPGMEC": {
    body: [
      ["NEET-PG 2026 mark sheet\n", "A copy of the NEET-PG 2026 mark sheet\n"],
      [
        "Place and date of birth and Indian citizenship: school leaving / transfer certificate (and birth certificate or passport if the birthplace is not on it)",
        "Place and date of birth and Indian citizenship: school leaving / transfer certificate, compulsory for all (and a birth certificate or passport if the birthplace is not on it)",
      ],
      ["Passport, for dual / foreign citizenship or NRI", "A copy of the passport, for dual / foreign citizenship or NRI"],
      ["Disability certificate (PwD)\nNOC from the competent authority (in-service candidates)", "A photocopy of the disability certificate (PwD)"],
    ],
    notes: [
      [
        "Without every original document the allotted student has no right of admission.",
        "Without every original document the allotted student has no right of admission.\nAllotted an NRI seat: a ₹10 lakh deposit before confirming the admission, refunded after the whole admission process.",
      ],
    ],
  },
};

// The code file: the same line swaps, inside each state's entry (the lists are joined with "\n" there, one string a line).
const file = "src/lib/pgDocuments.ts";
let code = fs.readFileSync(file, "utf8");
const EOL = code.includes("\r\n") ? "\r\n" : "\n";
const asLines = (t) => t.split("\n").filter(Boolean);
let codeChanged = 0;
for (const [title, parts] of Object.entries(EDITS)) {
  const start = code.indexOf(`title: ${JSON.stringify(title)}`);
  const end = code.indexOf("checked: CHECKED", start);
  if (start < 0 || end < 0) { console.log(`code: ${title} not found`); continue; }
  let block = code.slice(start, end);
  for (const [o, n] of [...parts.body, ...parts.notes]) {
    // In code each line is its own string literal: compare as a run of literals.
    const oLit = asLines(o).map((l) => `      ${JSON.stringify(l)},`).join(EOL);
    const nLit = asLines(n).map((l) => `      ${JSON.stringify(l)},`).join(EOL);
    if (block.includes(oLit)) { block = block.replace(oLit, nLit); codeChanged++; }
    else if (o.endsWith("\n") && n === "" && block.includes(`      ${JSON.stringify(o.trim())},${EOL}`)) { block = block.replace(`      ${JSON.stringify(o.trim())},${EOL}`, ""); codeChanged++; }
    else if (block.includes(`notes: ${JSON.stringify(o)},`)) { block = block.replace(`notes: ${JSON.stringify(o)},`, `notes: [${EOL}${nLit}${EOL}    ].join("\\n"),`); codeChanged++; }
    else console.log(`code: ${title}: not found — ${o.slice(0, 60)}`);
  }
  code = code.slice(0, start) + block + code.slice(end);
}
console.log(`code edits: ${codeChanged}`);

for (const [title, parts] of Object.entries(EDITS)) {
  const [r] = await sql`SELECT id, body, data FROM content_blocks WHERE collection = 'pg_documents_official' AND title = ${title} AND is_active`;
  if (!r) { console.log(`db: ${title} — no row`); continue; }
  let body = r.body;
  let data = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
  if (typeof data === "string") data = JSON.parse(data);
  for (const [o, n] of parts.body) { if (body.includes(o)) body = body.replace(o, n); else console.log(`db ${title}: body not found — ${o.slice(0, 60)}`); }
  for (const [o, n] of parts.notes) { if ((data.notes ?? "").includes(o)) data.notes = data.notes.replace(o, n); else console.log(`db ${title}: notes not found — ${o.slice(0, 60)}`); }
  console.log(`db ${title}: ${body !== r.body || JSON.stringify(data) !== JSON.stringify(typeof r.data === "string" ? JSON.parse(r.data) : r.data) ? "changes ready" : "nothing"}`);
  if (APPLY) await sql`UPDATE content_blocks SET body = ${body}, data = ${sql.json(data)}, updated_at = now() WHERE id = ${r.id}`;
}
if (APPLY) { fs.writeFileSync(file, code); console.log("applied"); } else console.log("dry run — pass --apply");
await sql.end();
