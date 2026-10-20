// Loads per-seat terms — fee, stipend by year, service bond, seat-leaving penalty, hostel — from the
// PG data session's export (zynerd_pg_fee_stipend_bond.csv) into pg_seat_terms (migration 0039).
// Replaces the table in one transaction.
//
// Provenance stays what it is: a third-party compilation. source_type is copied as given; pages
// must not present these figures as official.
//
// College matching as in import_mcc_handoff.ts: our_id + alt_our_ids at confidence >= 0.80, and a
// DNB / NBE-diploma row goes to the candidate holding DNB seats, any other row to the one holding
// MD/MS seats.
//
//   npx tsx --env-file=.env.local scripts/import_seat_terms.ts [file] [--dry-run]
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

const file = process.argv.find((a, i) => i > 1 && !a.startsWith("--")) ?? "D:/Admisson Hands/pg_handoff/from_pg/zynerd_pg_fee_stipend_bond.csv";
const dry = process.argv.includes("--dry-run");
const rows = <T,>(r: unknown) => r as unknown as T[];

function parseCsv(path: string): Record<string, string>[] {
  const text = readFileSync(path, "utf8").replace(/^\uFEFF/, "");
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell.replace(/\r$/, "")); out.push(row); row = []; cell = ""; }
    else cell += ch;
  }
  if (cell || row.length) { row.push(cell); out.push(row); }
  const [head, ...body] = out;
  return body.filter((r) => r.length > 1).map((r) => Object.fromEntries(head.map((k, i) => [k, r[i] ?? ""])));
}

const num = (v: string) => (v && /^\d+(\.\d+)?$/.test(v.trim()) ? Math.round(Number(v)) : null);
const yes = (v: string) => (v?.trim().toUpperCase() === "Y" ? true : null);

const courseId = new Map(rows<{ id: number; name: string }>(await db.execute(sql`SELECT id, name FROM courses`)).map((c) => [c.name, c.id]));
const kinds = new Map<number, { mdms: boolean; dnb: boolean }>();
for (const r of rows<{ id: number; mdms: boolean; dnb: boolean }>(
  await db.execute(sql`
    SELECT i.id,
           BOOL_OR(c.name ~ '^(MD|MS|MCh|Master) ' OR (c.name LIKE 'Diploma%' AND c.name NOT LIKE '%-NBE')) AS mdms,
           BOOL_OR(c.name LIKE 'DNB%' OR c.name LIKE '%-NBE') AS dnb
      FROM institutes i JOIN seat_options so ON so.institute_id = i.id JOIN courses c ON c.id = so.course_id
     WHERE i.level = 'pg' GROUP BY i.id`),
)) kinds.set(r.id, { mdms: r.mdms, dnb: r.dnb });
const pgIds = new Set(rows<{ id: number }>(await db.execute(sql`SELECT id FROM institutes WHERE level = 'pg'`)).map((r) => r.id));

const stats = { matched: 0, switched: 0, unmatched: 0, noCourse: 0 };
const terms = parseCsv(file).map((r) => {
  const dnbRow = /^(DNB|Diploma \(NBE\))/i.test(r.degree) || /-NBE$/.test(r.course);
  const confidence = Number(r.match_confidence) || 0;
  const ids = [r.our_id, ...(r.alt_our_ids ?? "").split(/[^0-9]+/)]
    .map((x) => (x && /^\d+$/.test(x) ? Number(x) : null))
    .filter((x): x is number => x != null && pgIds.has(x));
  let institute: number | null = null;
  if (ids.length && confidence >= 0.8) {
    const fits = ids.filter((id) => (dnbRow ? kinds.get(id)?.dnb : kinds.get(id)?.mdms));
    institute = fits[0] ?? ids[0];
    if (institute !== ids[0]) stats.switched++;
    stats.matched++;
  } else stats.unmatched++;
  const cid = courseId.get(r.course) ?? null;
  if (!cid) stats.noCourse++;
  const bond = r.bond_years?.trim();
  return {
    institute_id: institute,
    match_confidence: confidence || null,
    state: r.state || null,
    college_name: r.college_name,
    institute_type: r.institute_type || null,
    managing_authority: r.managing_authority || null,
    course: r.course,
    course_id: cid,
    degree: r.degree || null,
    seat_type: r.seat_type || null,
    counselling: r.counselling || null,
    categories: r.categories || null,
    fee_inr: num(r.fee_inr),
    nri_fee_usd: num(r.nri_fee_usd),
    fee_session: r.fee_session || null,
    fee_session_basis: r.fee_session_basis || null,
    stipend_y1: num(r.stipend_y1_inr_per_month),
    stipend_y2: num(r.stipend_y2_inr_per_month),
    stipend_y3: num(r.stipend_y3_inr_per_month),
    bond_years: bond && /^\d+$/.test(bond) ? Number(bond) : null,
    bond_unknown: !bond || !/^\d+$/.test(bond),
    bond_penalty_inr: num(r.bond_penalty_inr),
    bond_terms_vary_by: r.bond_terms_vary_by || null,
    hostel_fee_min_inr: num(r.hostel_fee_min_inr),
    hostel_fee_max_inr: num(r.hostel_fee_max_inr),
    hostel_fee_period: r.hostel_fee_period || null,
    hostel_included_in_fee: yes(r.hostel_included_in_fee),
    hostel_includes_mess: yes(r.hostel_includes_mess),
    seat_leaving_penalty_inr: num(r.seat_leaving_penalty_inr),
    seat_leaving_no_penalty: yes(r.seat_leaving_no_penalty),
    seat_leaving_refund_stipend: yes(r.seat_leaving_refund_stipend),
    seat_leaving_full_course_fee: yes(r.seat_leaving_full_course_fee),
    seat_leaving_debarment_years: num(r.seat_leaving_debarment_years),
    go_reference: r.go_reference || null,
    details_source: r.details_source || null,
    source_type: r.source_type || "third-party compilation",
    source_url: r.source_url || null,
    fetched_on: /^\d{4}-\d{2}-\d{2}$/.test(r.fetched_on ?? "") ? r.fetched_on : null,
    as_of: r.as_of || null,
  };
});
console.log("terms:", terms.length, "rows |", JSON.stringify(stats));
if (dry) process.exit(0);

const cols = Object.keys(terms[0]);
await db.transaction(async (tx) => {
  await tx.execute(sql`DELETE FROM pg_seat_terms`);
  for (let i = 0; i < terms.length; i += 400) {
    const chunk = terms.slice(i, i + 400);
    await tx.execute(sql`
      INSERT INTO pg_seat_terms (${sql.raw(cols.join(", "))})
      VALUES ${sql.join(chunk.map((r) => sql`(${sql.join(cols.map((c) => sql`${(r as Record<string, unknown>)[c] ?? null}`), sql`, `)})`), sql`, `)}`);
  }
});
const [c] = rows<{ n: number; colleges: number }>(await db.execute(sql`SELECT COUNT(*)::int AS n, COUNT(DISTINCT institute_id)::int AS colleges FROM pg_seat_terms`));
console.log("loaded:", c);
process.exit(0);
