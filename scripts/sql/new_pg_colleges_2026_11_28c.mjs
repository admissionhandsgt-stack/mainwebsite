/**
 * Arundathi Institute of Medical Sciences, Medchal (Telangana) — its first PG seats are in KNRUHS's 2026 Management Quota
 * second phase (28-11-2026; 24 lines), where it is the counsellor tool's college 9441 (owner, 2026-11-28: "ok kardo sab new
 * colleges ko badhiya se"). NMC's register: TS/002/P/4, private, Kaloji Narayana Rao University of Health Sciences, MBBS
 * since 2023. Same shape as scripts/sql/new_pg_colleges_2026_11_28.mjs; MCC has no row for it yet. No fee is written.
 *
 *   node --env-file=.env.local scripts/sql/new_pg_colleges_2026_11_28c.mjs            # dry run (rolled back)
 *   node --env-file=.env.local scripts/sql/new_pg_colleges_2026_11_28c.mjs --apply --backup <file>
 *   node --env-file=.env.local scripts/sql/new_pg_colleges_2026_11_28c.mjs --restore <file>
 * Then reload Telangana's Round 2 (TEL Govt PG + TEL Mgmt PG) so its lines attach.
 */
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const apply = args.includes("--apply");
const backup = opt("--backup");
const restore = opt("--restore");
if (apply && !backup) throw new Error("--apply needs --backup <file>");

// [tool id, name, state, ownership, city, district, NMC code, MCC name test (SQL ILIKE)]
const G = "government";
const COLLEGES = [
  [9441, "Arundathi Institute of Medical Sciences, Medchal", "Telangana", "private", "Medchal", "Medchal-Malkajgiri", "TS/002/P/4", "%arundathi%"],
];
const METHOD = "admin-2026-11-28";

const slugify = (s) =>
  s.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 170);

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

if (restore) {
  const b = JSON.parse(readFileSync(restore, "utf8"));
  await sql.begin(async (tx) => {
    await tx`UPDATE mcc_seat_matrix SET institute_id = NULL, match_confidence = NULL, match_method = NULL WHERE id IN ${tx(b.matrix.length ? b.matrix : [0])}`;
    await tx`UPDATE mcc_allotments SET institute_id = NULL, match_confidence = NULL, match_method = NULL WHERE id IN ${tx(b.allotments.length ? b.allotments : [0])}`;
    await tx`UPDATE mcc_allotments SET state = NULL WHERE id IN ${tx(b.allotmentsStateWasNull?.length ? b.allotmentsStateWasNull : [0])}`;
    await tx`DELETE FROM nmc_institutes WHERE institute_id IN ${tx(b.institutes)}`;
    await tx`UPDATE state_round_cuts SET institute_id = NULL WHERE institute_id IN ${tx(b.institutes)}`;
    await tx`DELETE FROM institutes WHERE id IN ${tx(b.institutes)}`;
  });
  console.log(`restored: removed ${b.institutes.length} institutes and their MCC matches`);
  await sql.end();
  process.exit(0);
}

const out = { institutes: [], matrix: [], allotments: [], allotmentsStateWasNull: [] };
try {
  await sql.begin(async (tx) => {
    for (const [sid, name, state, own, city, district, code, mccLike] of COLLEGES) {
      const st = (await tx`SELECT id FROM states WHERE name = ${state}`)[0];
      if (!st) throw new Error(`no state ${state}`);
      const had = (await tx`SELECT id, slug FROM institutes WHERE level = 'pg' AND source_id = ${sid}`)[0];
      const nmc = code
        ? (await tx`
            SELECT MIN(university_name) AS uni, MIN(inception_year) FILTER (WHERE course_type = 'M.B.B.S.') AS yr,
                   SUM(approved_seat) FILTER (WHERE course_type = 'M.B.B.S.')::int AS mbbs
              FROM nmc_courses WHERE college_code = ${code}`)[0]
        : null;
      if (code && !nmc?.uni) throw new Error(`NMC code ${code} not in the register`);
      let id = had?.id;
      let slug = had?.slug;
      if (!id) {
        slug = slugify(name);
        if ((await tx`SELECT 1 FROM institutes WHERE slug = ${slug}`).length) slug = `${slug}-${sid}`;
        id = (await tx`
          INSERT INTO institutes (source_id, name, slug, level, ownership, state_id, district, city, university, management,
                                  established_year, mbbs_intake, is_active, created_at, updated_at)
          VALUES (${sid}, ${name}, ${slug}, 'pg', ${own}, ${st.id}, ${district}, ${city}, ${nmc?.uni ?? null},
                  ${own === G ? "Govt." : "Private"}, ${nmc?.yr ? Number(nmc.yr) : null}, ${nmc?.mbbs ?? null}, true, now(), now())
          RETURNING id`)[0].id;
        out.institutes.push(id);
      }
      if (code && !(await tx`SELECT 1 FROM nmc_institutes WHERE institute_id = ${id}`).length)
        await tx`INSERT INTO nmc_institutes (college_code, institute_id, method, level, updated_at) VALUES (${code}, ${id}, 'admin', 'pg', now())`;
      const m = await tx`
        UPDATE mcc_seat_matrix SET institute_id = ${id}, match_confidence = 1, match_method = ${METHOD}
         WHERE institute_id IS NULL AND year = 2026 AND mcc_college_name ILIKE ${mccLike}
           AND (state IS NULL OR state = ${state}) AND seat_matrix <> 'DNB'
        RETURNING id`;
      // A matched allotment carries its college's state, as the round ingest gives every match.
      const a = await tx`
        SELECT id, state FROM mcc_allotments
         WHERE institute_id IS NULL AND year = 2026 AND mcc_college_name ILIKE ${mccLike}
           AND (state IS NULL OR state = ${state}) AND NOT (mcc_course ILIKE 'DNB%' OR mcc_course ILIKE '(NBEMS%')`;
      if (a.length)
        await tx`UPDATE mcc_allotments SET institute_id = ${id}, match_confidence = 1, match_method = ${METHOD}, state = COALESCE(state, ${state})
                  WHERE id IN ${tx(a.map((r) => r.id))}`;
      out.matrix.push(...m.map((r) => r.id));
      out.allotments.push(...a.map((r) => r.id));
      out.allotmentsStateWasNull.push(...a.filter((r) => r.state == null).map((r) => r.id));
      console.log(`${had ? "kept   " : "created"} ${String(id).padStart(5)} ${sid} ${slug} | NMC ${code ?? "—"} | MCC matrix ${m.length}, allotments ${a.length}`);
    }
    console.log(`\n${out.institutes.length} institutes created, MCC matrix rows ${out.matrix.length}, allotment rows ${out.allotments.length}`);
    if (!apply) throw new Error("dry run — rolled back");
    writeFileSync(backup, JSON.stringify(out, null, 1));
    console.log(`applied; undo with --restore ${backup}`);
  });
} catch (e) {
  if (!String(e.message).startsWith("dry run")) throw e;
  console.log("(dry run — nothing written; pass --apply --backup <file>)");
}
await sql.end();
