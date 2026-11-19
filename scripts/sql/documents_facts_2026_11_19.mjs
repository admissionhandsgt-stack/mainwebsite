// The document checklists, corrected against MCC's own 2026 bulletins (2026-11-19, owner: "documents required checklist
// and other things mai galat chije mentioned hai … ekdum ache se verify karke sahi karo").
//   MD/MS page (pg_documents):        MCC's NEET PG Counselling 2026 Information Bulletin, chapter 12.2 and FAQ 6
//   MBBS page (mbbs_documents):       MCC's NEET UG Counselling 2026 Information Bulletin (1 Aug 2026), Q. 32
//   NRI page (nri_documents):         the same two bulletins' NRI chapters + the NEET UG 2026 user guide, section 8
//   /neet-pg-documents (MCC's row):   two "essential" marks and the Gazetted Officer rule, chapter 12.2
//   mbbs.documents.disclaimer:        the note under the MBBS list
// The rows are what the admin edits; each is changed only while it still holds the text shipped before (so an admin's
// own edit is never overwritten). The new text is the same as the code's shipped fallback in this release.
//   node --env-file=.env.local scripts/sql/documents_facts_2026_11_19.mjs [--apply]
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const PG_OLD = ["NEET PG Scorecard & Rank Letter", "MBBS Degree Certificate", "Internship Completion Certificate", "NMC/State Medical Council Registration", "All MBBS Year Mark Sheets", "Attempt Certificate", "Photo ID Proof", "Date of Birth Certificate", "Category/Caste Certificate", "Domicile Certificate"];
const PG_NEW = [
  ["MCC allotment letter", "Or your state counselling's — print it from your login"],
  ["NEET PG 2026 admit card", "Issued by NBEMS"],
  ["NEET PG 2026 result / rank letter", "Issued by NBEMS"],
  ["MBBS mark sheets", "1st, 2nd and 3rd professional examinations"],
  ["MBBS degree or provisional certificate", "MCC marks it essential — no admission without it"],
  ["Internship completion certificate", "Or the head of institution's certificate that it ends by 30 Sep 2026"],
  ["State Medical Council registration", "Permanent; provisional only if the internship ends by 30 Sep 2026"],
  ["Class 10 or birth certificate", "Proof of date of birth"],
  ["Photo ID", "Driving licence, voter ID, passport or Aadhaar"],
  ["SC/ST, OBC-NCL or EWS certificate", "If you claim it — in MCC's format; OBC on the Central List; income for the year ending 31 Mar 2026"],
  ["PwD eligibility certificate", "If you claim it — only from MCC's authorised medical board, with your UDID card"],
  ["Your state counselling's own extras", "Domicile, bonds, an NOC or an MBBS attempt certificate — each state's own list"],
];

const MBBS_OLD = ["NEET-UG Scorecard & Admit Card", "Class 10 Marksheet & Certificate", "Class 12 Marksheet & Certificate", "Transfer Certificate (TC)", "Domicile / Residence Certificate", "Category Certificate (SC/ST/OBC/EWS)", "Aadhaar Card / Photo ID", "Passport Size Photographs (8-10)", "Income Certificate (if applicable)", "Migration Certificate"];
const MBBS_NEW = ["MCC allotment letter (or your state's)", "NEET UG 2026 admit card (NTA)", "NEET UG 2026 result / rank letter (NTA)", "Class 10 certificate (date of birth proof)", "Class 12 certificate and marksheet", "Photo ID: Aadhaar, PAN, driving licence or passport", "8 passport-size photos, same as on the NEET form", "SC/ST, OBC-NCL (Central List) or EWS certificate, if claimed", "PwD certificate from MCC's medical board, if claimed", "Domicile certificate — state quota seats only"];
const MBBS_DISCLAIMER_OLD = "Document requirements may vary by state and college. Always verify with the official counselling authority.";
const MBBS_DISCLAIMER_NEW = "MCC's list for NEET UG 2026 (information bulletin, Q. 32). A state counselling or the allotted college may ask for more — a transfer or migration certificate, a gap affidavit — so check its list before you report.";

const NRI_OLD = ["NRI certificate from the Indian embassy or consulate", "Passport of the NRI parent or relative, with visa or residence permit", "OCI or PIO card", "Self-attested declaration in MCC's format", "Relationship certificate with a family tree", "Notarised sponsorship affidavit", "NRE bank account passbook of the sponsor", "NEET admit card and scorecard", "Class 10 and Class 12 marksheets and certificates", "Birth certificate", "Your passport or your sponsor's (optional)"];
const G1 = "Every NRI-quota candidate", G2 = "If you, a parent or a real brother or sister is the NRI", G3 = "If an NRI guardian sponsors you", G4 = "OCI candidates", G5 = "Foreign nationals";
const NRI_NEW = [
  ["Date of birth certificate", G1, "Listed first by MCC in every category."],
  ["Class 10 mark sheet and pass certificate", G1, "From a foreign board: the Association of Indian Universities' (AIU) equivalence certificate — for MD/MS, a certified transcript also counts."],
  ["Class 12 mark sheet and pass certificate", G1, "The same rule for a foreign board."],
  ["NEET score card", G1, "NEET UG's from NTA for MBBS and BDS; NEET PG's from NBEMS for MD/MS."],
  ["Your valid passport", G1, "Required in every category in 2026 — a foreign national's foreign passport."],
  ["MBBS mark sheets (MD/MS only)", G1, "1st, 2nd and 3rd professional examinations — and the FMGE score card if you studied MBBS abroad."],
  ["NRI certificate from the Indian embassy or consulate", G2, "Issued by the competent authority in the country where the NRI lives."],
  ["Notarised sponsorship affidavit", G2, "By the NRI parent, brother or sister: they will pay the whole course fee and your living costs during the course. For MD/MS, on ₹100 stamp paper."],
  ["NRE bank account passbook of the sponsor", G2, "The proof behind the affidavit. For MD/MS an NRO passbook is also accepted."],
  ["Relationship verified by a revenue officer", G2, "A Tehsildar or another government officer of the revenue department (for MD/MS, a Patwari too) confirms how the NRI is related to you."],
  ["NRI certificate and passport of the guardian", G3, "The guardian's NRI certificate from the Indian embassy or consulate; for MBBS and BDS, the guardian's valid passport too."],
  ["Proof of guardianship", G3, "The guardian must be your nearest NRI relation — a real uncle or aunt on either side, a grandparent or a first cousin — who has looked after you. MBBS/BDS: legal proof that they are your guardian under the Guardian and Wards Act 1890."],
  ["Guardian's affidavit with evidence (MD/MS)", G3, "As candidates are adults, no court order is needed: a notarised affidavit on ₹100 stamp paper that they have cared for and supported you, with evidence such as fee receipts they paid, educational records and bank records."],
  ["Guardian's sponsorship affidavit and NRE passbook", G3, "They will pay the whole course fee and your living costs during the course."],
  ["OCI card", G4, "For MBBS and BDS a PIO card is also accepted."],
  ["Visa, residence permit or work permit", G5, "For MBBS and BDS. For MD/MS MCC asks for a citizenship certificate instead."],
];

const MCC_FIXES = [
  ["Internship completion certificate — or a certificate from the head of the institution that the internship will be complete by 30 September 2026", "[E] Internship completion certificate — or a certificate from the head of the institution that the internship will be complete by 30 September 2026"],
  ["OBC (non-creamy layer) certificate in the bulletin's format", "[E] OBC (non-creamy layer) certificate in the bulletin's format"],
];
const MCC_NOTE_OLD = "A certificate in another language: carry a certified English copy with the original.";
const MCC_NOTE_NEW = "A certificate in another language: carry an English or Hindi translation certified by a Gazetted Officer, with the original.";

async function replaceCollection(tx, collection, oldTitles, rows) {
  const have = await tx`SELECT id, title, display_order FROM content_blocks WHERE collection = ${collection} ORDER BY display_order, id`;
  const titles = have.map((r) => r.title);
  if (JSON.stringify(titles) !== JSON.stringify(oldTitles)) {
    console.log(`${collection}: rows differ from the shipped list (edited in the admin?) — left alone`, titles);
    return;
  }
  for (let i = 0; i < rows.length; i++) {
    const [title, subtitle, body] = rows[i];
    if (i < have.length) await tx`UPDATE content_blocks SET title = ${title}, subtitle = ${subtitle}, body = ${body}, display_order = ${i}, updated_at = now() WHERE id = ${have[i].id}`;
    else await tx`INSERT INTO content_blocks (collection, title, subtitle, body, data, display_order, is_active) VALUES (${collection}, ${title}, ${subtitle}, ${body}, '{}'::jsonb, ${i}, true)`;
  }
  console.log(`${collection}: ${Math.min(rows.length, have.length)} updated, ${Math.max(0, rows.length - have.length)} added`);
}

await sql.begin(async (tx) => {
  // pg_documents: title = name, body = note (as stored).
  await replaceCollection(tx, "pg_documents", PG_OLD, PG_NEW.map(([n, d]) => [n, null, d]));
  await replaceCollection(tx, "mbbs_documents", MBBS_OLD, MBBS_NEW.map((n) => [n, null, null]));
  await replaceCollection(tx, "nri_documents", NRI_OLD, NRI_NEW);

  const d = await tx`UPDATE site_settings SET value = ${MBBS_DISCLAIMER_NEW}, updated_at = now() WHERE key = 'mbbs.documents.disclaimer' AND value = ${MBBS_DISCLAIMER_OLD} RETURNING key`;
  console.log("mbbs.documents.disclaimer:", d.length ? "updated" : "left alone (edited or missing)");

  const [mcc] = await tx`SELECT id, body, data::text AS data FROM content_blocks WHERE collection = 'pg_documents_official' AND title LIKE 'MCC%' LIMIT 1`;
  if (mcc) {
    let body = mcc.body;
    for (const [o, n] of MCC_FIXES) if (body.includes(o) && !body.includes(n)) body = body.replace(o, n);
    const data = JSON.parse(typeof mcc.data === "string" ? JSON.parse(mcc.data) === mcc.data ? mcc.data : mcc.data : "{}");
    const obj = typeof data === "string" ? JSON.parse(data) : data;
    if (typeof obj.notes === "string") obj.notes = obj.notes.replace(MCC_NOTE_OLD, MCC_NOTE_NEW);
    await tx`UPDATE content_blocks SET body = ${body}, data = ${tx.json(obj)}, updated_at = now() WHERE id = ${mcc.id}`;
    console.log("pg_documents_official MCC:", body !== mcc.body ? "essential marks added" : "marks already there", "| note:", obj.notes?.includes("Gazetted") ? "Gazetted Officer" : "not changed");
  }
  if (!APPLY) throw new Error("dry run — nothing written (pass --apply)");
}).catch((e) => console.log(e.message));
await sql.end();
