// MCC college matches that were wrong or missing (audit of 2026-11-05, owner's OK: "aise aur bhi chije identify karo
// and tik karo"). Found when a student poster showed GMC Vidisha's Round 1 rows filed under GMC Chhindwara.
//
//   node --env-file=.env.local scripts/fix_mcc_matches_2026_11_05.mjs                 dry run: what each fix would move
//   node --env-file=.env.local scripts/fix_mcc_matches_2026_11_05.mjs --apply         back up, then fix in one transaction
//   node --env-file=.env.local scripts/fix_mcc_matches_2026_11_05.mjs --restore <f>   put every changed row back
//
// Three kinds, in mcc_allotments and mcc_seat_matrix (pg_seat_terms was checked and is clean):
//   1. Wrong city — a generic "Government Medical College, <city>" matched at 0.805 to another city's GMC (Vidisha,
//      Khandwa, Shahdol → Chhindwara; Azamgarh → the Kannauj twin; Rajouri → Jammu; GMC Kannur → Kannur Medical College).
//   2. Twin entries — our PG list holds many hospitals twice (the MD/MS entry and a DNB entry named with a PIN code);
//      MCC's MD/MS and college-diploma rows sat on the DNB entry, which holds no MD/MS seats. Moved to the MD/MS entry.
//      NBE diplomas ("Diploma-Emergency Medicine" at private hospitals) belong on the DNB entry and are not touched.
//   3. Never matched — MCC's names for colleges we hold under another name (HBT Mumbai, PCMC Pune, RGMC Kalwa…).
// Each target was checked by hand against MCC's wording (address, former names). Every changed row's old institute is
// backed up first; the fixed names are added to scripts/data/mcc_name_decisions.json so a re-import keeps them.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import postgres from "postgres";

const APPLY = process.argv.includes("--apply");
const restoreAt = process.argv.indexOf("--restore");
const BACKUP = "D:/Admisson Hands/match_backups/mcc_matches_before_2026_11_05.json";
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

if (restoreAt > 0) {
  const rows = JSON.parse(readFileSync(process.argv[restoreAt + 1], "utf8"));
  await sql.begin(async (tx) => {
    for (const r of rows)
      await tx.unsafe(`UPDATE ${r.table} SET institute_id = $1, state = $2, match_method = $3 WHERE id = $4`, [r.institute_id, r.state, r.match_method, r.id]);
  });
  console.log(`restored ${rows.length} rows`);
  await sql.end();
  process.exit(0);
}

// A DNB / NBE row, by MCC's course label (as the ingest and the importer read it).
const DNB = String.raw`(mcc_course ~* 'NBEMS|DNB|NBE|^Diploma-')`;
const MATRIX_DNB = `(seat_matrix = 'DNB')`;

/** [label, name ILIKE pattern | null, from-institute | null, to-institute, scope] — scope: "wrong" (any current id),
 *  "null" (only unmatched rows), "twin" (rows on `from`). All only for MD/MS rows unless `dnb` is set. */
const FIXES = [
  // 1. wrong city
  ["GMC Vidisha (was Chhindwara)", "%Government Medical College, Vidisha%", null, 406, "wrong"],
  ["GMC Khandwa (was Chhindwara)", "%Government Medical College, Khandwa%", null, 841, "wrong"],
  ["GMC Shahdol (was Chhindwara / none)", "%Shahdol%", null, 1838, "wrong"],
  ["GMC Azamgarh (was the Kannauj twin)", "%MEDICAL COLLEGE%AZAMGARH%", null, 1191, "wrong"],
  ["GMC Rajouri (was GMC Jammu)", "%Government Medical College, Rajouri%", null, 615, "wrong"],
  ["GMC Rajouri, DNB seats (none)", "%Rajouri%", null, 650, "null", { dnb: true }],
  // MCC writes it "- KANNUR" and "-KANNUR"; Kannur Medical College's own rows (Anjarakandy) stay where they are.
  ["GMC Kannur (was Kannur Medical College)", "%GOVERNMENT MEDICAL COLLEGE%-%KANNUR%", null, 77, "wrong"],
  // 2. twin entries
  ["Medical College, Kolkata", null, 1832, 66, "twin"],
  ["MP Shah GMC, Jamnagar", null, 1833, 83, "twin"],
  ["NRS Medical College, Kolkata", null, 1262, 60, "twin"],
  ["GGS Medical College, Faridkot", null, 1861, 188, "twin"],
  ["GMC Kannauj", "%kannauj%", 1884, 701, "twin"],
  ["ASMC Firozabad", null, 1424, 481, "twin"],
  ["BPS GMC for Women, Sonepat", null, 393, 1498, "twin"],
  ["Maharaja Suheldev ASMC, Bahraich", null, 1225, 956, "twin"],
  ["Maharshi Vashistha ASMC, Basti", null, 827, 1705, "twin"],
  ["Bharat Ratna Atal Bihari Vajpayee MC, Rajnandgaon", null, 1021, 1401, "twin"],
  ["JLN Medical College, Bhagalpur", null, 425, 424, "twin"],
  ["SVN GMC, Yavatmal", null, 407, 263, "twin"],
  ["SBH GMC, Dhule", null, 1157, 326, "twin"],
  ["GIMS, Greater Noida", null, 174, 306, "twin"],
  ["ESIC Medical College, Alwar", null, 337, 537, "twin"],
  ["Fakir Mohan MC, Balasore", null, 1130, 603, "twin"],
  ["PRM Medical College, Baripada", null, 1048, 187, "twin"],
  ["Dr YS Parmar GMC, Nahan", null, 1933, 1835, "twin"],
  // 3. never matched
  ["SRVS GMC, Shivpuri", "%Govt Medical college Shivpuri%", null, 917, "null"],
  ["HBT Medical College, Mumbai", "Hinduhridayasamrat%", null, 82, "null"],
  ["PCMC PG Institute, Pimpri", "Pimpri Chi%chwad Municipal%", null, 59, "null"],
  ["PGIMS, Navi Mumbai", "Post Graduate Institute of Medical Sciences (PGIMS)%Navi Mumbai%", null, 273, "null"],
  ["GMC Bharatpur (SJP)", "SJP Medical College%Bharatpur%", null, 313, "null"],
  ["GMC Shahjahanpur", "Autonomous State Medical College, Shahjahanpur%", null, 614, "null"],
  ["Rajiv Gandhi MC, Kalwa, Thane", "RAJIV GANDHI MEDICAL COLLEGE KALWA%", null, 200, "null"],
  ["Late Baliram Kashyap Memorial GMC, Jagdalpur", "Late Baliram Kashyap Memorial Govt Medical Dimrapal%", null, 591, "null"],
  ["BMIMS Pawapuri (Vardhman)", "VARDHMAN INSTITUTE OF MEDICAL SCIENCES, NALANDA%", null, 475, "null"],
  ["GB Pant Institute, New Delhi", "G B Pant Institute of Post Graduate Medical Education%", null, 30, "null"],
  ["PGICH, Noida", "Post Graduate Institute of Child Health, Noida%", null, 1072, "null"],
  ["DIMHANS, Dharwad", "Dharwad Institute of Mental Health%", null, 1031, "null"],
  ["UNS ASMC, Jaunpur", "Umanath Singh Autonomous State Medical College, Jaunpur%", null, 885, "null"],
  ["Acharya Harihar Cancer Centre, Cuttack", "Acharya Harihar Post Graduate Institute of Cancer%", null, 1415, "null"],
  ["Institute of Aerospace Medicine, Bengaluru", "Institute of Aerospace Medicine%", null, 981, "null"],
  ["RMC, BARC, Mumbai", "Radiation Medicine Centre (RMC)%", null, 67, "null"],
  ["Homi Bhabha Cancer Hospital, New Chandigarh", "HOMI BHABHA CANCER HOSPITAL AND RESEARCH CENTRE, NEW CHANDIGARH%", null, 112, "null"],
  ["Dr B Borooah Cancer Institute", "Dr.B.Borooah Cancer Institute%", null, 647, "null"],
  ["GMC Baramulla", "Government Medical College Kanth Bagh Baramulla%", null, 1016, "null"],
  ["GMC Hamirpur (HP)", "Govt. Medical College, Hamirpur%Himachal%", null, 737, "null"],
  ["Maa Vindhyavashini ASMC, Mirzapur", "Maa Vindhyavashini Autonomous State Medical College%", null, 1842, "null"],
  ["Regional Institute of Ophthalmology, Sitapur", "Regional Instt. of Opthalmology%", null, 928, "null"],
  // SRM Institute of Science and Technology is the deemed university at Kattankulathur (Kancheepuram district); its
  // 2024–25 paid and NRI seats sat on Trichy SRM (a state-counselling college). 2026's rows are already on 1523.
  ["SRM Medical College, Kattankulathur (was Trichy SRM)", "SRM MEDICAL COLLEGE HOSPITAL AND RESEARCH CENTRE, SRM INSTITUTE OF SCIENCE%", null, 1523, "wrong"],
  // Rampurhat GMC is one entry in our list (its other MCC rows are already on it), so it holds no MD/MS seat_options.
  ["Rampurhat GMC", "Rampurhat Government Medical College & Hospital%", null, 934, "null", { only: true }],
];

// Every MD/MS target must hold MD/MS seats; the one DNB target must hold DNB seats.
const kinds = new Map(
  (await sql`SELECT i.id, i.name, s.name AS state,
                    bool_or(c.name !~* '^(DNB|DrNB|FNB|Diploma|PG Diploma)') AS mdms, bool_or(c.name ~* '^(DNB|DrNB|FNB)' OR c.name ~* 'NBEMS') AS dnb
               FROM institutes i LEFT JOIN states s ON s.id = i.state_id
               LEFT JOIN seat_options so ON so.institute_id = i.id LEFT JOIN courses c ON c.id = so.course_id
              WHERE i.level = 'pg' GROUP BY i.id, i.name, s.name`).map((r) => [r.id, r]),
);
const bad = FIXES.filter(([, , , to, , o]) => !o?.only && !(o?.dnb ? kinds.get(to)?.dnb : kinds.get(to)?.mdms));
if (bad.length) {
  console.error("targets without the right seats:", bad.map((f) => `${f[0]} → ${f[3]}`).join("; "));
  process.exit(1);
}

function where(table, [, pattern, from, to, scope, o]) {
  const kindSql = table === "mcc_allotments" ? (o?.dnb ? DNB : `NOT ${DNB}`) : o?.dnb ? MATRIX_DNB : `NOT ${MATRIX_DNB}`;
  const parts = [kindSql, `institute_id IS DISTINCT FROM ${to}`];
  const params = [];
  if (pattern) parts.push(`mcc_college_name ILIKE $${params.push(pattern)}`);
  if (scope === "twin") parts.push(`institute_id = ${from}`);
  if (scope === "null") parts.push(`institute_id IS NULL`);
  return { text: parts.join(" AND "), params };
}

const backup = [];
const names = new Map(); // letters(name) -> { id, name }
const letters = (s) => s.toUpperCase().replace(/[^A-Z]/g, "");
let total = 0;
for (const f of FIXES) {
  const line = [];
  for (const table of ["mcc_allotments", "mcc_seat_matrix"]) {
    const w = where(table, f);
    const rows = await sql.unsafe(`SELECT id, institute_id, state, match_method, mcc_college_name FROM ${table} WHERE ${w.text}`, w.params);
    if (!rows.length) continue;
    line.push(`${table === "mcc_allotments" ? "allotments" : "matrix"} ${rows.length}`);
    total += rows.length;
    for (const r of rows) {
      backup.push({ table, id: r.id, institute_id: r.institute_id, state: r.state, match_method: r.match_method });
      if (!f[5]?.dnb) names.set(letters(r.mcc_college_name), { id: f[3], name: r.mcc_college_name, label: f[0] });
    }
  }
  console.log(`${f[0].padEnd(48)} → [${f[3]}] ${kinds.get(f[3]).name.slice(0, 50).padEnd(50)} ${line.join(", ") || "nothing to change"}`);
}
console.log(`\n${total} rows to change, ${names.size} distinct MCC names`);

if (!APPLY) {
  console.log("Dry run — nothing written. --apply to back up and fix.");
  await sql.end();
  process.exit(0);
}

mkdirSync("D:/Admisson Hands/match_backups", { recursive: true });
// A later pass never overwrites an earlier pass's backup: restore the last pass first, then the one before.
let backupFile = BACKUP;
for (let n = 2; existsSync(backupFile); n++) backupFile = BACKUP.replace(/\.json$/, `_pass${n}.json`);
writeFileSync(backupFile, JSON.stringify(backup));
console.log(`backup: ${backupFile} (${backup.length} rows)`);

await sql.begin(async (tx) => {
  for (const f of FIXES) {
    for (const table of ["mcc_allotments", "mcc_seat_matrix"]) {
      const w = where(table, f);
      const state = kinds.get(f[3]).state;
      await tx.unsafe(
        `UPDATE ${table} SET institute_id = ${f[3]}, state = $${w.params.length + 1}, match_method = 'admin' WHERE ${w.text}`,
        [...w.params, state],
      );
    }
  }
});
console.log("applied");

// Keep them through a re-import of the handoff: one decision per fixed name (its letters), MD/MS rows only.
const file = "scripts/data/mcc_name_decisions.json";
const dec = JSON.parse(readFileSync(file, "utf8"));
const have = new Set(dec.decisions.map((d) => `${d.pattern}|${d.kind}`));
let added = 0;
for (const [pattern, v] of names) {
  if (have.has(`${pattern}|mdms`)) continue;
  dec.decisions.push({ pattern, kind: "mdms", id: v.id, note: `match audit 2026-11-05: ${v.label}` });
  added++;
}
writeFileSync(file, JSON.stringify(dec, null, 2).replace(/\n {4}\{\n {6}/g, "\n    { ").replace(/,\n {6}/g, ", ").replace(/\n {4}\}/g, " }") + "\n");
console.log(`decisions added: ${added}`);
await sql.end();
