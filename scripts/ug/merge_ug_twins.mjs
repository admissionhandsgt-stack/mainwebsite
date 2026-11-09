// One MBBS college held as two UG institutes ("twins"): its rows are moved onto one, the other is switched off and
// its URL 308s there (src/lib/collegeMerges.ts). Also corrects the MES pair, whose MBBS and BDS ranks were filed
// under each other's name, and pairs MES Medical College with its NMC record.
//
//   node --env-file=.env.local scripts/ug/merge_ug_twins.mjs                         dry run: what would move
//   node --env-file=.env.local scripts/ug/merge_ug_twins.mjs --apply --backup <file>
//   node --env-file=.env.local scripts/ug/merge_ug_twins.mjs --restore <file>
//
// How the twins came about: the UG scrape (2026-09) listed a college under one name on its list pages and another on
// its detail pages, so 2025 state rounds sat on one entry and the AIQ (and from 2026-11-09 MCC's 2026 results) on the
// other. Each page showed half the college, the predictor named it twice, and the sitemap listed both.
// Each pair was checked on 2026-11-09: same state, same college by NMC's register (the kept entry is the one NMC is
// paired with), and the two entries' rows complement each other — no (year, course, round, quota, category,
// counselling) is on both. A pair with any such overlap is refused. SVIMS Tirupati (4609 vs 3419) overlaps on all
// 15 rows with different ranks, so it is not a twin and stays as it is.
//
// After a fresh UG scrape import, run this again: the import recreates rows on the twin by source id.
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const flag = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null; };
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

// [twin, kept, why, new name for the kept entry (optional)]
export const PAIRS = [
  [3728, 3965, "GMC Bhawanipatna is Saheed Rendo Majhi MC (NMC OD/004/G/1)"],
  [3950, 3701, "GMC Bhadradri = GMC Bhadradri Kothagudem (NMC TS/019/G/1)"],
  [3959, 3434, "Maharaja Jitendra Narayan MC is now Coochbehar GMC (NMC WB/007/G/1)", "Coochbehar Government Medical College & Hospital, Coochbehar"],
  [3970, 3680, "GMC Shivpuri = Shrimant Rajmata Vijayaraje Scindia GMC (NMC MP/016/G/1)"],
  [4080, 4302, "Shillong Medical College (NMC ML/003/G/5)"],
  [4310, 3406, "GMC Banda = Government Allopathic MC, Banda (NMC UP/030/G/1)"],
  [4451, 4549, "Kilpauk Medical College (NMC TN/043/G/1)"],
  [4475, 4546, "IRT Perundurai MC is now Government Erode MC, Perundurai (NMC TN/015/G/1)"],
  [4547, 4477, "Government Thiruvannamalai MC (NMC TN/032/G/1)"],
  [4552, 3322, "Purulia GMC; the kept entry was named after its hospital, Deben Mahato (Sadar) (NMC WB/032/G/1)", "Purulia Government Medical College & Hospital, Purulia"],
  [4144, 4551, "College of Medicine and Sagore Dutta Hospital (NMC WB/006/G/1)"],
  [4650, 4359, "ESIC Medical College, Sanath Nagar (NMC TS/011/G/1)"],
  [4259, 3885, "ASMC Akbarpur = ASMC Kanpur Dehat (NMC UP/016/G/1)"],
  [3957, 3910, "GMC Mumbai at Gokuldas Tejpal Hospital, L.T. Marg (NMC MH/024/G/1)"],
  [3946, 3575, "Rajarshi Dashrath ASMC, Ayodhya = GMC Faizabad (NMC UP/034/G/1)"],
  [4263, 4064, "MPGIMER Nashik = GMC Nashik (NMC MH/047/G/1); state rounds on one entry, AIQ on the other"],
  [4452, 4476, "'Duplicate Government Sivagangai Medical College' (fees only) = Government Sivagangai MC (NMC TN/031/G/1)"],
  [3878, 3508, "ASMC Bahraich (fees only) = Rajkiya Allopathic MC, Bahraich (NMC UP/063/G/1)"],
  [3320, 3597, "ASMC Society and S.N.M District Hospital (fees only) = GMC Firozabad (NMC UP/035/G/1)"],
  [2977, 4333, "Shri Vinobha Bhave Institute (fees only) = NAMO MERI, Silvassa (NMC ND/001/G/1)"],
];
// MES, Malappuram: the source filed MES Medical College's MBBS ranks under "MES Dental College" and the dental
// college's BDS ranks under "MES Medical College" (known gap #1 since 2026-09-22). NMC KL/024/P/4 is MES Medical
// College (MBBS, 200 seats); MES Dental College has no MBBS course.
const MES_DENTAL = 3181;
const MES_MEDICAL = 4668;
const MES_NMC = "KL/024/P/4";

const twins = PAIRS.map((p) => p[0]);
const kept = PAIRS.map((p) => p[1]);

if (args[0] === "--restore") {
  const b = JSON.parse(readFileSync(args[1], "utf8"));
  await sql.begin(async (tx) => {
    for (const r of b.ranks) await tx`UPDATE closing_ranks SET institute_id = ${r.institute_id} WHERE id = ${r.id}`;
    const ids = b.fees.map((f) => f.id);
    if (ids.length) await tx`DELETE FROM fees WHERE id IN ${tx(ids)}`;
    for (let i = 0; i < b.fees.length; i += 200) await tx`INSERT INTO fees ${tx(b.fees.slice(i, i + 200))}`;
    for (const r of b.cuts) await tx`UPDATE state_round_cuts SET institute_id = ${r.institute_id} WHERE id = ${r.id}`;
    for (const i of b.institutes) await tx`UPDATE institutes SET name = ${i.name}, is_active = ${i.is_active}, updated_at = ${i.updated_at} WHERE id = ${i.id}`;
    await tx`DELETE FROM nmc_institutes WHERE college_code = ${MES_NMC}`;
    if (b.nmc.length) await tx`INSERT INTO nmc_institutes ${tx(b.nmc)}`;
  });
  await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY seat_options`;
  console.log(`restored from ${args[1]}; seat_options refreshed`);
  await sql.end();
  process.exit(0);
}

const apply = args.includes("--apply");
const backup = flag("--backup");
if (apply && !backup) throw new Error("--apply needs --backup <file>");

const inst = await sql`SELECT * FROM institutes WHERE id IN ${sql([...twins, ...kept, MES_DENTAL, MES_MEDICAL])}`;
const byId = new Map(inst.map((i) => [i.id, i]));
const problems = [];
for (const [t, k] of PAIRS) {
  const a = byId.get(t), b = byId.get(k);
  if (!a || !b) { problems.push(`${t} or ${k} missing`); continue; }
  if (a.level !== "ug" || b.level !== "ug") problems.push(`${t}/${k} not both UG`);
  if (a.state_id !== b.state_id && !(t === 2977)) problems.push(`${t}/${k} different states`);
  const nmc = await sql`SELECT 1 FROM nmc_institutes WHERE institute_id = ${k}`;
  if (!nmc.length) problems.push(`${k} (kept) has no NMC pairing`);
  const ov = await sql`
    SELECT count(*)::int n FROM closing_ranks a JOIN closing_ranks b ON a.institute_id = ${t} AND b.institute_id = ${k}
       AND a.year = b.year AND a.course_id = b.course_id AND a.round_label = b.round_label
       AND a.quota_id IS NOT DISTINCT FROM b.quota_id AND a.category_id IS NOT DISTINCT FROM b.category_id
       AND a.counselling_id IS NOT DISTINCT FROM b.counselling_id`;
  if (ov[0].n) problems.push(`${t}/${k}: ${ov[0].n} rank rows on both — not a twin`);
}
if (problems.length) { console.log("REFUSED:\n  " + problems.join("\n  ")); await sql.end(); process.exit(1); }

const ranks = await sql`
  SELECT cr.id, cr.institute_id FROM closing_ranks cr JOIN courses c ON c.id = cr.course_id
   WHERE cr.institute_id IN ${sql(twins)}
      OR (cr.institute_id = ${MES_DENTAL} AND c.name ILIKE 'MBBS%')
      OR (cr.institute_id = ${MES_MEDICAL} AND c.name ILIKE 'BDS%')`;
const fees = await sql`SELECT * FROM fees WHERE institute_id IN ${sql(twins)}`;
const cuts = await sql`SELECT id, institute_id FROM state_round_cuts WHERE institute_id IN ${sql(twins)}`;
const nmc = await sql`SELECT * FROM nmc_institutes WHERE college_code = ${MES_NMC}`;

for (const [t, k, why, rename] of PAIRS) {
  const a = byId.get(t), b = byId.get(k);
  const n = ranks.filter((r) => r.institute_id === t).length;
  const f = fees.filter((x) => x.institute_id === t).length;
  console.log(`${t} ${a.slug}\n   -> ${k} ${b.slug}${rename ? `\n      renamed "${b.name}" -> "${rename}"` : ""}\n      ${n} rank rows, ${f} fee rows · ${why}`);
}
const mesM = ranks.filter((r) => r.institute_id === MES_DENTAL).length;
const mesB = ranks.filter((r) => r.institute_id === MES_MEDICAL).length;
console.log(`MES: ${mesM} MBBS rank rows ${MES_DENTAL} -> ${MES_MEDICAL}, ${mesB} BDS rank rows ${MES_MEDICAL} -> ${MES_DENTAL}; NMC ${MES_NMC} -> ${MES_MEDICAL}`);
console.log(`total: ${ranks.length} rank rows, ${fees.length} fee rows, ${cuts.length} state-round rows, ${PAIRS.length} entries switched off`);

if (!apply) { console.log("dry run — nothing written"); await sql.end(); process.exit(0); }

writeFileSync(backup, JSON.stringify({ at: new Date().toISOString(), ranks, fees, cuts, nmc, institutes: inst }));
await sql.begin(async (tx) => {
  for (const [t, k, , rename] of PAIRS) {
    await tx`UPDATE closing_ranks SET institute_id = ${k} WHERE institute_id = ${t}`;
    // A fee the kept entry already lists (same course, year, amount, quota) is a duplicate, not a second fee.
    await tx`
      DELETE FROM fees f USING fees g
       WHERE f.institute_id = ${t} AND g.institute_id = ${k} AND g.course_id = f.course_id
         AND g.year IS NOT DISTINCT FROM f.year AND g.fee_inr IS NOT DISTINCT FROM f.fee_inr
         AND g.quota_id IS NOT DISTINCT FROM f.quota_id`;
    // Duplicates within the twin's own rows go too, so one figure is not listed twice on the kept page.
    await tx`
      DELETE FROM fees f USING fees g
       WHERE f.institute_id = ${t} AND g.institute_id = ${t} AND g.id < f.id AND g.course_id = f.course_id
         AND g.year IS NOT DISTINCT FROM f.year AND g.fee_inr IS NOT DISTINCT FROM f.fee_inr
         AND g.quota_id IS NOT DISTINCT FROM f.quota_id`;
    await tx`UPDATE fees SET institute_id = ${k} WHERE institute_id = ${t}`;
    await tx`UPDATE state_round_cuts SET institute_id = ${k} WHERE institute_id = ${t}`;
    await tx`UPDATE state_round_allotments SET institute_id = ${k} WHERE institute_id = ${t}`;
    await tx`UPDATE saved_colleges SET institute_slug = ${byId.get(k).slug} WHERE institute_slug = ${byId.get(t).slug}`;
    await tx`UPDATE institutes SET is_active = false, updated_at = now() WHERE id = ${t}`;
    if (rename) await tx`UPDATE institutes SET name = ${rename}, updated_at = now() WHERE id = ${k}`;
    else await tx`UPDATE institutes SET updated_at = now() WHERE id = ${k}`;
  }
  const mbbs = ranks.filter((r) => r.institute_id === MES_DENTAL).map((r) => r.id);
  const bds = ranks.filter((r) => r.institute_id === MES_MEDICAL).map((r) => r.id);
  if (mbbs.length) await tx`UPDATE closing_ranks SET institute_id = ${MES_MEDICAL} WHERE id IN ${tx(mbbs)}`;
  if (bds.length) await tx`UPDATE closing_ranks SET institute_id = ${MES_DENTAL} WHERE id IN ${tx(bds)}`;
  await tx`UPDATE institutes SET updated_at = now() WHERE id IN (${MES_DENTAL}, ${MES_MEDICAL})`;
  await tx`DELETE FROM nmc_institutes WHERE college_code = ${MES_NMC}`;
  await tx`INSERT INTO nmc_institutes (college_code, institute_id, method) VALUES (${MES_NMC}, ${MES_MEDICAL}, 'admin')`;
});
await sql`REFRESH MATERIALIZED VIEW CONCURRENTLY seat_options`;
console.log(`applied; backup ${backup}; seat_options refreshed`);
await sql.end();
