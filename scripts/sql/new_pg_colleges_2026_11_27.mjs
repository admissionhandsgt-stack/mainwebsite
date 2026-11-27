/**
 * Nine colleges whose first MD/MS seats are in the 2026 counselling (owner, 2026-11-27: "ye bhi okay hai", for the seven
 * Uttar Pradesh colleges after the two West Bengal ones), as the counsellor tool lists them (its college_id is our
 * source_id, final). They were in WBMCC's and DGME UP's Round 2 lists — and three of them in MCC's 2026 matrix and Round 2
 * — with no institute of ours, so they had no page and their seats counted only by printed name.
 *
 * The same shape as scripts/sql/new_pg_colleges_2026_11_25.mjs: per college the institute (PG), its NMC pairing (the
 * register lists only its MBBS so far; Kalyan Singh Super Speciality Cancer Institute is not in NMC's register at all, so
 * it has none), and MCC's 2026 seat-matrix and allotment rows that name it and had no institute (MD/MS rows only).
 * Not touched: MCC's "Kalyan Singh Government Medical College" rows (Bulandshahr's first MD/MS seats) — our only PG entry
 * for that college, 504, is its DNB twin, so they wait for the owner's word on an MD/MS entry of its own.
 * No fee is written: none of them has a 2026-27 notice we hold.
 * (Applied 2026-11-27 as institutes 4755–4763; the dry runs had used up 4737–4754.)
 *
 *   node --env-file=.env.local scripts/sql/new_pg_colleges_2026_11_27.mjs            # dry run (rolled back)
 *   node --env-file=.env.local scripts/sql/new_pg_colleges_2026_11_27.mjs --apply --backup <file>
 *   node --env-file=.env.local scripts/sql/new_pg_colleges_2026_11_27.mjs --restore <file>
 * Then reload WB PG and UP PG Round 2 (scripts/import_state_round_feed.ts) so their lines attach.
 */
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const apply = args.includes("--apply");
const backup = opt("--backup");
const restore = opt("--restore");
if (apply && !backup) throw new Error("--apply needs --backup <file>");

// [tool id, name, state, ownership, city, district, NMC code (null: not in the register), MCC name test (SQL ILIKE)]
const G = "government";
const P = "private";
const UP = "Uttar Pradesh";
const WB = "West Bengal";
const COLLEGES = [
  [9402, "Kalyan Singh Super Speciality Cancer Institute, Lucknow", UP, G, "Lucknow", "Lucknow", null, "%kalyan singh super speciality cancer%"],
  [9456, "Ajay Sangaal Institute of Medical Sciences and Ayushman Hospital, Shamli", UP, P, "Shamli", "Shamli", "UP/001/P/4", "%sangaal%"],
  [9457, "Autonomous State Medical College, Sultanpur", UP, G, "Sultanpur", "Sultanpur", "UP/002/G/1", "%autonomous state medical college%sultanpur%"],
  [9458, "Baba Kina Ram Autonomous State Medical College and Hospital, Chandauli", UP, G, "Chandauli", "Chandauli", "UP/020/G/1", "%kina ram%"],
  [9459, "Dr B.S. Kushwah Medical College, Kanpur", UP, P, "Kanpur", "Kanpur Nagar", "UP/023/P/4", "%kushwah%"],
  [9460, "KMC Medical College & Hospital, Maharajganj", UP, P, "Maharajganj", "Maharajganj", "UP/049/P/6", "%kmc medical college%maharajganj%"],
  [9461, "Shri Siddhi Vinayak Medical College & Hospital, Sambhal", UP, P, "Sambhal", "Sambhal", "UP/077/P/3", "%siddhi vinayak%"],
  [9462, "Jhargram Government Medical College & Hospital, Jhargram", WB, G, "Jhargram", "Jhargram", "WB/020/G/1", "%jhargram government medical college%"],
  [9465, "Sarat Chandra Chattopadhyay Government Medical College & Hospital, Uluberia", WB, G, "Uluberia", "Howrah", "WB/038/G/1", "%sarat chandra chattopadhyay%"],
];
const METHOD = "admin-2026-11-27";

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
           AND (state IS NULL OR state = ${state}) AND mcc_course !~* '^(DNB|\\(NBEMS)'`;
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
