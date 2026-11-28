/**
 * MCC's NEET PG 2026 Round 2 result prints some colleges by a name no earlier list carried, so the ingest left their MD/MS
 * rows with no institute (found in the college-mapping audit of 2026-11-28, owner: "sare colleges ki mapping ekdum ache se
 * double verification ke validate karo"). Each name here was checked against the college's MCC matrix rows:
 *  - five government colleges printed with their address where Round 1's matrix printed the town (their MD/MS entries
 *    were created by scripts/sql/new_pg_colleges_2026_11_28b.mjs);
 *  - the armed forces' PG institutions (AFMS quota), printed with their address;
 *  - Karpaga Vinayaga (MCC's matrix already on our 2059) and "Amrita School of Medicine" — the short name of the Faridabad
 *    school (796): Kochi's Round 2 rows say "…, Elamkara, Kochi", and Faridabad's matrix holds every course these rows name.
 * Exact names only; DNB and NBE rows are never touched. The matches become earlier-round names, so later rounds that print
 * the same name are matched by the ingest itself.
 *
 *   node --env-file=.env.local scripts/sql/mcc_round2_names_2026_11_28.mjs            # dry run
 *   node --env-file=.env.local scripts/sql/mcc_round2_names_2026_11_28.mjs --apply --backup <file>
 *   node --env-file=.env.local scripts/sql/mcc_round2_names_2026_11_28.mjs --restore <file>
 */
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const apply = args.includes("--apply");
const backup = opt("--backup");
const restore = opt("--restore");
if (apply && !backup) throw new Error("--apply needs --backup <file>");

// [MCC's name exactly as printed, our PG institute's source_id or id (id: prefix "#"), state]
const NAMES = [
  ["GOVERNMENT MEDICAL COLLEGE, NEW BULDING,CIVIL HOSPITAL COMPOUND MARWAD GALLI ,OSMANABAD", 99111, "Maharashtra"],
  ["GOVERNMENT MEDICAL COLLEGE, 467, Sadar bazar, Camp, Satara 415001", 99112, "Maharashtra"],
  ["GOVERNMENT MEDICAL COLLEGE, Washim Road, Balsond, Hingoli.", 99107, "Maharashtra"],
  ["GOVERNMENT MEDICAL COLLEGE, Dean Office, Civil Hospital Campus, Beach Road, Limaye Wadi, Alibag, Raigad", 99105, "Maharashtra"],
  ["GOVERNMENT MEDICAL COLLEGE, 3- JAIL CIRCLE DHOBI GATTA ROAD, ALWAR", 99114, "Rajasthan"],
  ["Armed Forces Medical College, SOLAPUR ROAD NEAR RACE COURSE OPPOSITE OLD COMMAND HOSPITAL, WANOWARI PUNE", "#637", "Maharashtra"],
  ["INSTITUTE OF NAVAL MEDICINE, INHS ASVINI, COLABA, MUMBAI 400005", "#800", "Maharashtra"],
  ["Command Hospital, Alipore, Kolkata", "#1095", "West Bengal"],
  ["COMMAND HOSPITAL, AIR FORCE, BANGALORE, OLD AIRPORT ROAD, AGRAM POST, BANGALORE", "#1690", "Karnataka"],
  ["Command Hospital, Cariappa Road, Cantonment, Lucknow", "#1153", "Uttar Pradesh"],
  ["Command Hospital, Chandimandir Panchkula Haryana", "#1685", "Haryana"],
  ["Institute of Aerospace Medicine IAF, Old Airport Road, Vimanapura Post, Bengaluru", "#981", "Karnataka"],
  ["Karpaga Vinayaga Institute of Medical Sciences and Research Centre", "#2059", "Tamil Nadu"],
  ["Amrita School of Medicine", "#796", "Haryana"],
];
const METHOD = "admin-2026-11-28";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

if (restore) {
  const b = JSON.parse(readFileSync(restore, "utf8"));
  await sql.begin(async (tx) => {
    await tx`UPDATE mcc_allotments SET institute_id = NULL, match_confidence = NULL, match_method = NULL WHERE id IN ${tx(b.ids.length ? b.ids : [0])}`;
    await tx`UPDATE mcc_allotments SET state = NULL WHERE id IN ${tx(b.stateWasNull.length ? b.stateWasNull : [0])}`;
  });
  console.log(`restored ${b.ids.length} rows`);
  await sql.end();
  process.exit(0);
}

const out = { ids: [], stateWasNull: [] };
try {
  await sql.begin(async (tx) => {
    for (const [name, ref, state] of NAMES) {
      const inst = String(ref).startsWith("#")
        ? (await tx`SELECT id, name FROM institutes WHERE level = 'pg' AND id = ${Number(String(ref).slice(1))}`)[0]
        : (await tx`SELECT id, name FROM institutes WHERE level = 'pg' AND source_id = ${ref}`)[0];
      if (!inst) throw new Error(`no institute ${ref}`);
      const rows = await tx`
        SELECT id, state FROM mcc_allotments
         WHERE year = 2026 AND institute_id IS NULL AND mcc_college_name = ${name}
           AND NOT (mcc_course ILIKE 'DNB%' OR mcc_course ILIKE '(NBEMS%')`;
      if (rows.length)
        await tx`UPDATE mcc_allotments SET institute_id = ${inst.id}, match_confidence = 1, match_method = ${METHOD}, state = COALESCE(state, ${state})
                  WHERE id IN ${tx(rows.map((r) => r.id))}`;
      out.ids.push(...rows.map((r) => r.id));
      out.stateWasNull.push(...rows.filter((r) => r.state == null).map((r) => r.id));
      console.log(`${String(rows.length).padStart(3)} → ${inst.id} ${inst.name.slice(0, 60)}  ← ${name.slice(0, 60)}`);
    }
    console.log(`\n${out.ids.length} allotment rows matched`);
    if (!apply) throw new Error("dry run — rolled back");
    writeFileSync(backup, JSON.stringify(out, null, 1));
    console.log(`applied; undo with --restore ${backup}`);
  });
} catch (e) {
  if (!String(e.message).startsWith("dry run")) throw e;
  console.log("(dry run — nothing written; pass --apply --backup <file>)");
}
await sql.end();
