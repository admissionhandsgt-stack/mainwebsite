/**
 * MCC's 2026 matrix names 21 colleges' MD/MS seats with no MD/MS entry of ours (owner, 2026-11-28: "ok kardo sab new
 * colleges ko badhiya se" and "sare colleges ki mapping ekdum ache se double verification ke validate karo"). Almost
 * all came with MCC's "Newly added seats, Round 2" notice of 12 Nov 2026 — their first MD/MS seats:
 *  - 17 government colleges in the All India Quota matrix. Most exist on our side only as their NBEMS entry (the name with
 *    the PIN code, DNB / NBE diplomas) or as an MBBS entry; each gets its MD/MS entry, as Kalyan Singh GMC did
 *    (scripts/sql/new_pg_colleges_2026_11_28.mjs), and the two pages link each other where the names pair.
 *  - 4 deemed universities' colleges in the Deemed matrix: Graphic Era (Dehradun), KLE JGMM (Hubballi, under KLE Academy),
 *    IMS & SUM Campus II (Phulnakhara, under Siksha 'O' Anusandhan — NMC's register names ABVMU Lucknow, an error),
 *    D Y Patil University School of Medicine (Ambi, under D. Y. Patil Education Society, Kolhapur).
 * Plus Dhanalakshmi Srinivasan Medical College, Perambalur (our 2072): MCC's 2026 Deemed matrix and its Round 2 name it
 * (it moved from Tamil Nadu's counselling to MCC's deemed counselling in 2026); those rows had no institute. Kept, matched.
 * Source ids 99105–99125 are ours (MCC-only colleges; the counsellor tool keys a hospital by one id, so its state lines
 * stay on the entry that carries the tool's id). No fee is written.
 *
 *   node --env-file=.env.local scripts/sql/new_pg_colleges_2026_11_28b.mjs            # dry run (rolled back)
 *   node --env-file=.env.local scripts/sql/new_pg_colleges_2026_11_28b.mjs --apply --backup <file>
 *   node --env-file=.env.local scripts/sql/new_pg_colleges_2026_11_28b.mjs --restore <file>
 */
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const apply = args.includes("--apply");
const backup = opt("--backup");
const restore = opt("--restore");
if (apply && !backup) throw new Error("--apply needs --backup <file>");

// [source id, name, state, ownership, city, district, NMC code (null: not in the register), MCC name test (SQL ILIKE), university (when NMC's is wrong)]
const G = "government";
const D = "deemed";
const MH = "Maharashtra";
const WB = "West Bengal";
const COLLEGES = [
  [99105, "Government Medical College, Alibag", MH, G, "Alibag", "Raigad", "MH/026/G/1", "%government medical college, alibag%"],
  [99106, "Government Medical College, Ambernath", MH, G, "Ambernath", "Thane", "MH/027/G/1", "%government medical college, ambernath%"],
  [99107, "Government Medical College, Hingoli", MH, G, "Hingoli", "Hingoli", "MH/035/G/1", "%government medical college, hingoli%"],
  [99108, "Government Medical College, Jalna", MH, G, "Jalna", "Jalna", "MH/037/G/1", "%government medical college, jalna%"],
  [99109, "Government Medical College, G.T. Hospital Campus, Mumbai", MH, G, "Mumbai", "Mumbai", "MH/024/G/1", "%government medical college l.t. marg%"],
  [99110, "Government Medical College, Nashik", MH, G, "Nashik", "Nashik", "MH/047/G/1", "%bytco%"],
  [99111, "Government Medical College, Osmanabad", MH, G, "Osmanabad", "Dharashiv", "MH/042/G/1", "%government medical college, osmanabad%"],
  [99112, "Government Medical College, Satara", MH, G, "Satara", "Satara", "MH/044/G/1", "%government medical college, satara%"],
  [99113, "Saheed Laxman Nayak Medical College, Koraput", "Odisha", G, "Koraput", "Koraput", "OD/016/G/1", "%laxman nayak%"],
  [99114, "Government Medical College, Alwar", "Rajasthan", G, "Alwar", "Alwar", "RJ/011/G/5", "%government medical college, alwar%"],
  [99115, "Barasat Government Medical College, Barasat", WB, G, "Barasat", "North 24 Parganas", "WB/002/G/1", "%barasat government medical college%"],
  [99116, "Coochbehar Government Medical College, Coochbehar", WB, G, "Coochbehar", "Cooch Behar", "WB/007/G/1", "%coochbehar government medical college%"],
  [99117, "Deben Mahata Government Medical College, Purulia", WB, G, "Purulia", "Purulia", "WB/032/G/1", "%deben mahata government medical college%"],
  [99118, "Dr B C Roy Multi Speciality Medical Research Centre, IIT Kharagpur", WB, G, "Kharagpur", "Paschim Medinipur", null, "%dr b c roy multi speciality%"],
  [99119, "Jalpaiguri Government Medical College, Jalpaiguri", WB, G, "Jalpaiguri", "Jalpaiguri", "WB/019/G/1", "%jalpaiguri government medical college%"],
  [99120, "Prafulla Chandra Sen Government Medical College, Arambagh", WB, G, "Arambagh", "Hooghly", "WB/031/G/1", "%prafulla chandra sen%"],
  [99121, "Tamralipto Government Medical College, Tamluk", WB, G, "Tamluk", "Purba Medinipur", "WB/040/G/1", "%tamralipto government medical college%"],
  [99122, "Graphic Era Institute of Medical Sciences, Dehradun", "Uttarakhand", D, "Dehradun", "Dehradun", "UK/005/P/4", "%graphic era%"],
  [99123, "KLE JGMM Medical College, Hubballi", "Karnataka", D, "Hubballi", "Dharwad", "KA/025/P/4", "%moorusavir%"],
  [99124, "IMS & SUM Hospital Campus II, Phulnakhara, Bhubaneswar", "Odisha", D, "Bhubaneswar", "Cuttack", "OD/009/P/3", "%phulnakhara%", "Siksha 'O' Anusandhan (Deemed to be University), Bhubaneswar"],
  [99125, "DY Patil University School of Medicine, Ambi, Pune", MH, D, "Pune", "Pune", "MH/020/P/3", "%d y patil university school of medicine%"],
  // Kept (our 2072, source 323): only its MCC rows are matched.
  [323, "Dhanalakshmi Srinivasan Medical College and Hospital, Perambalur", "Tamil Nadu", D, "Perambalur", "Perambalur", "TN/011/P/3", "%dhanalakshmi srinivasan medical college%"],
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
    for (const [sid, name, state, own, city, district, code, mccLike, uniOverride] of COLLEGES) {
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
          VALUES (${sid}, ${name}, ${slug}, 'pg', ${own}, ${st.id}, ${district}, ${city}, ${uniOverride ?? nmc?.uni ?? null},
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
