// Loads MCC's NEET PG seat matrix and AIQ allotment results — handed over as CSV by the PG data
// session (D:\Admisson Hands\pg_handoff\from_pg) — into mcc_seat_matrix and mcc_allotments
// (migration 0038). Replaces both tables in one transaction; a person's decisions in
// mcc_institute_names survive.
//
// College matching: the handoff gives our_id + alt_our_ids (other entries of ours for the same
// college) at confidence >= 0.80. Our PG data often lists a college twice — its MD/MS entry and a
// DNB entry for the same hospital — so an MD/MS/Diploma row goes to the candidate that holds
// MD/MS seats, a DNB row to the one that holds DNB seats.
//
//   npx tsx --env-file=.env.local scripts/import_mcc_handoff.ts [dir] [--dry-run]
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { ourCourseFor, programmeLabel } from "@/lib/mccCourses";
import { stateKey } from "@/lib/nmcSync";

const dir = process.argv.find((a, i) => i > 1 && !a.startsWith("--")) ?? "D:/Admisson Hands/pg_handoff/from_pg";
const dry = process.argv.includes("--dry-run");
const rows = <T,>(r: unknown) => r as unknown as T[];

function parseCsv(file: string): Record<string, string>[] {
  const text = readFileSync(file, "utf8").replace(/^\uFEFF/, "");
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

const int = (v: string) => (v && /^-?\d+$/.test(v.trim()) ? Number(v) : 0);
const intOrNull = (v: string) => (v && /^\d+$/.test(v.trim()) ? Number(v) : null);

// Our courses, and what kind of seats each PG institute holds.
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

// A person's decisions (scripts/data/mcc_name_decisions.json): a run of the name's letters, an
// optional state, the kind of row (mdms | dnb | any) and our institute.
const letters = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "");
const decisions = (
  JSON.parse(readFileSync("scripts/data/mcc_name_decisions.json", "utf8")).decisions as
    { pattern: string; state?: string; kind: "mdms" | "dnb" | "any"; id: number | null }[]
).map((d) => ({ ...d, stateKey: d.state ? stateKey(d.state) : null, caught: new Set<string>() }));

const stats = { byDecision: 0, byHandoff: 0, switched: 0, unmatched: 0, noCourse: 0 };
function place(r: Record<string, string>, ourCourse: string | null, state: string) {
  const kind = ourCourse && /^(DNB|Diploma.*-NBE)/.test(ourCourse) ? "dnb" : "mdms";
  const key = letters(r.mcc_college_name);
  const hit = decisions
    .filter((d) => key.includes(d.pattern) && (!d.stateKey || d.stateKey === stateKey(state)) && (d.kind === kind || d.kind === "any"))
    .sort((a, b) => Number(b.kind !== "any") - Number(a.kind !== "any") || b.pattern.length - a.pattern.length)[0];
  if (hit) {
    hit.caught.add(r.mcc_college_name);
    stats.byDecision++;
    return { id: hit.id, confidence: null as number | null, method: "admin" };
  }
  const confidence = Number(r.match_confidence) || 0;
  const ids = [r.our_id, ...(r.alt_our_ids ?? "").split(/[^0-9]+/)].map((x) => intOrNull(x)).filter((x): x is number => x != null && pgIds.has(x));
  if (!ids.length || confidence < 0.8) {
    stats.unmatched++;
    return { id: null, confidence: confidence || null, method: null as string | null };
  }
  const fits = ids.filter((id) => (kind === "dnb" ? kinds.get(id)?.dnb : kinds.get(id)?.mdms));
  const id = fits[0] ?? ids[0];
  if (id !== ids[0]) stats.switched++;
  stats.byHandoff++;
  return { id, confidence, method: "handoff" };
}

const seat = parseCsv(`${dir}/mcc_pg_seat_matrix_2026.csv`).map((r) => {
  const ours = ourCourseFor(r.course);
  if (!ours) stats.noCourse++;
  const state = (r.state ?? "").trim();
  const p = place(r, ours, state);
  return {
    year: int(r.as_of) || 2026,
    // The DDVL diploma's label broke the programme column ("Dermatology,"); ours is authoritative.
    programme: ours ? programmeLabel(ours) : r.programme,
    seat_matrix: r.seat_matrix,
    state,
    mcc_institute_code: r.mcc_institute_code || null,
    mcc_college_name: r.mcc_college_name,
    mcc_course: r.course,
    course_id: ours ? courseId.get(ours) ?? null : null,
    quota: r.quota || null,
    open_seats: int(r.Open), open_pwd: int(r["Open PwD"]), ews: int(r.EWS), ews_pwd: int(r["EWS PwD"]),
    obc: int(r.OBC), obc_pwd: int(r["OBC PwD"]), sc: int(r.SC), sc_pwd: int(r["SC PwD"]), st: int(r.ST), st_pwd: int(r["ST PwD"]),
    total_seats: int(r.total_seats),
    institute_id: p.id, match_confidence: p.confidence, match_method: p.method,
    source_title: r.source_title || null, source_file: r.source_file || null,
  };
});
const seatStats = { ...stats };
for (const k of Object.keys(stats) as (keyof typeof stats)[]) stats[k] = 0;

const allot = parseCsv(`${dir}/mcc_aiq_allotments_2024_2025.csv`).map((r) => {
  const ours = ourCourseFor(r.course);
  if (!ours) stats.noCourse++;
  const state = (r.state_detected ?? "").trim();
  const p = place(r, ours, state);
  return {
    year: int(r.year), round: r.round, rank: intOrNull(r.rank), quota: r.quota || null,
    mcc_college_name: r.mcc_college_name, state, mcc_course: r.course,
    course_id: ours ? courseId.get(ours) ?? null : null,
    allotted_category: r.allotted_category || null, candidate_category: r.candidate_category || null,
    status: r.status || null,
    institute_id: p.id, match_confidence: p.confidence, match_method: p.method,
    source_title: r.source_title || null, source_file: r.source_file || null,
  };
});

console.log("seat matrix:", seat.length, "rows,", seat.reduce((a, r) => a + r.total_seats, 0), "seats |", JSON.stringify(seatStats));
console.log("allotments:", allot.length, "rows |", JSON.stringify(stats));
// Every name a decision caught, so a pattern that reaches too far shows up here.
for (const d of decisions) {
  if (!d.caught.size) console.log("  UNUSED decision", d.pattern, d.kind);
  else if (process.argv.includes("--show-decisions"))
    console.log(`  ${d.pattern} [${d.kind}] -> ${d.id}:`, [...d.caught].map((n) => n.slice(0, 70)).join(" || "));
}
if (dry) process.exit(0);

const insert = async (tx: typeof db, table: "mcc_seat_matrix" | "mcc_allotments", list: Record<string, unknown>[]) => {
  const cols = Object.keys(list[0]);
  for (let i = 0; i < list.length; i += 500) {
    const chunk = list.slice(i, i + 500);
    await tx.execute(sql`
      INSERT INTO ${sql.raw(table)} (${sql.raw(cols.join(", "))})
      VALUES ${sql.join(chunk.map((r) => sql`(${sql.join(cols.map((c) => sql`${r[c] ?? null}`), sql`, `)})`), sql`, `)}`);
  }
};
await db.transaction(async (tx) => {
  await tx.execute(sql`DELETE FROM mcc_seat_matrix`);
  await tx.execute(sql`DELETE FROM mcc_allotments`);
  await insert(tx as unknown as typeof db, "mcc_seat_matrix", seat);
  await insert(tx as unknown as typeof db, "mcc_allotments", allot);
});
const [c] = rows<{ s: number; a: number }>(await db.execute(sql`SELECT (SELECT COUNT(*) FROM mcc_seat_matrix)::int AS s, (SELECT COUNT(*) FROM mcc_allotments)::int AS a`));
console.log("loaded:", c);
process.exit(0);
