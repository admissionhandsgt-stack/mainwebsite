/**
 * Thirty colleges whose first MD/MS seats are in the 2026 counselling (owner, 2026-11-25: "haan banado"), as the
 * counsellor tool lists them (zyn-81, 25 Nov: "each is new to PG in 2026 per NMC"; its college_id is our source_id, final).
 * They were in the states' 2026 allotment lists (KEA, Rajasthan, Tamil Nadu, KNRUHS) and in MCC's Round 2 under its own
 * names, with no institute of ours — so they had no page and their seats counted only by printed name.
 *
 * (Applied 2026-11-25 as institutes 4705–4734; the dry run had used up 4675–4704.)
 * Per college: the institute (PG), its NMC pairing (the college code NMC's register gives it; the register lists only its
 * MBBS so far, and its MD/MS courses follow at a later weekly sync), and MCC's 2026 seat-matrix and allotment rows that
 * name it and had no institute (MD/MS AIQ rows only: the pattern needs "Government Medical College" + the town, or the
 * college's own name). Not matched on purpose: MCC's "Government Medical College, The Nilgiris" row filed under
 * Telangana and its allotment "…The Nilgiris, Sangareddy, Telangana" — matched afterwards to GMC The Nilgiris (see CLAUDE.md).
 * No fee is written: none of them has a 2026-27 notice we hold.
 *
 *   node --env-file=.env.local scripts/sql/new_pg_colleges_2026_11_25.mjs            # dry run (rolled back)
 *   node --env-file=.env.local scripts/sql/new_pg_colleges_2026_11_25.mjs --apply --backup <file>
 *   node --env-file=.env.local scripts/sql/new_pg_colleges_2026_11_25.mjs --restore <file>
 */
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const apply = args.includes("--apply");
const backup = opt("--backup");
const restore = opt("--restore");
if (apply && !backup) throw new Error("--apply needs --backup <file>");

// [tool id, name, state, ownership, city, district, NMC code, MCC name test (SQL ILIKE), names to leave out]
const G = "government";
const P = "private";
const gmc = (town) => `%government medical college%${town}%`;
const COLLEGES = [
  [9405, "BGS Medical College and Hospital, Bengaluru", "Karnataka", P, "Bengaluru", null, "KA/009/P/3", null],
  [9407, "PES University Institute of Medical Sciences and Research, Bangalore", "Karnataka", P, "Bengaluru", null, "KA/047/P/1", null],
  [9408, "SR Patil Medical College and Hospital, Bagalkot", "Karnataka", P, "Bagalkot", "Bagalkot", "KA/059/P/3", null],
  [9425, "Shri Kalyan Government Medical College, Sikar", "Rajasthan", G, "Sikar", "Sikar", "RJ/044/G/1", "%shri kalyan%medical college%sikar%"],
  [9428, "Government Medical College, Ariyalur", "Tamil Nadu", G, "Ariyalur", "Ariyalur", "TN/017/G/1", gmc("ariyalur")],
  [9429, "Government Medical College, Dindigul", "Tamil Nadu", G, "Dindigul", "Dindigul", "TN/018/G/1", gmc("dindigul")],
  [9430, "Government Medical College, Kallakurichi", "Tamil Nadu", G, "Kallakurichi", "Kallakurichi", "TN/019/G/1", gmc("kallakurichi")],
  [9431, "Government Medical College, Karur", "Tamil Nadu", G, "Karur", "Karur", "TN/020/G/1", gmc("karur")],
  [9432, "Government Medical College, Krishnagiri", "Tamil Nadu", G, "Krishnagiri", "Krishnagiri", "TN/021/G/1", gmc("krishnagiri")],
  [9433, "Government Medical College, Nagapattinam", "Tamil Nadu", G, "Nagapattinam", "Nagapattinam", "TN/022/G/1", gmc("nagapattinam")],
  [9434, "Government Medical College, Namakkal", "Tamil Nadu", G, "Namakkal", "Namakkal", "TN/023/G/1", gmc("namakkal")],
  [9435, "Government Medical College, Ramanathapuram", "Tamil Nadu", G, "Ramanathapuram", "Ramanathapuram", "TN/026/G/1", gmc("ramanathapuram")],
  [9436, "Government Medical College, The Nilgiris", "Tamil Nadu", G, "Udhagamandalam", "The Nilgiris", "TN/027/G/1", gmc("nilgiris")],
  [9437, "Government Medical College, Tiruppur", "Tamil Nadu", G, "Tiruppur", "Tiruppur", "TN/029/G/1", gmc("tiruppur")],
  [9438, "Government Medical College, Virudhunagar", "Tamil Nadu", G, "Virudhunagar", "Virudhunagar", "TN/030/G/1", gmc("virudhunagar")],
  [9439, "Kanyakumari Medical Mission Research Centre, Kanyakumari", "Tamil Nadu", P, null, "Kanyakumari", "TN/040/P/3", null],
  [9440, "Takshashila Medical College", "Tamil Nadu", P, null, null, "TN/068/P/5", null],
  [9442, "Government Medical College, Jangaon", "Telangana", G, "Jangaon", "Jangaon", "TS/014/G/1", gmc("jangaon")],
  [9443, "Government Medical College, Khammam", "Telangana", G, "Khammam", "Khammam", "TS/015/G/1", gmc("khammam")],
  [9444, "Government Medical College, Jayashankar Bhupalpally", "Telangana", G, "Bhupalpally", "Jayashankar Bhupalpally", "TS/021/G/1", gmc("bhupalpally")],
  [9445, "Government Medical College, Kamareddy", "Telangana", G, "Kamareddy", "Kamareddy", "TS/023/G/1", gmc("kamareddy")],
  [9446, "Government Medical College, Karimnagar", "Telangana", G, "Karimnagar", "Karimnagar", "TS/024/G/1", gmc("karimnagar")],
  [9447, "Government Medical College, Mahabubabad", "Telangana", G, "Mahabubabad", "Mahabubabad", "TS/026/G/1", gmc("mahabubabad")],
  [9448, "Government Medical College, Mancherial", "Telangana", G, "Mancherial", "Mancherial", "TS/029/G/1", gmc("mancherial")],
  [9449, "Government Medical College, Nagarkurnool", "Telangana", G, "Nagarkurnool", "Nagarkurnool", "TS/031/G/1", gmc("nagarkurnool")],
  [9450, "Government Medical College, Narsampet", "Telangana", G, "Narsampet", "Warangal", "TS/034/G/1", gmc("narsampet")],
  [9451, "Government Medical College, Nirmal", "Telangana", G, "Nirmal", "Nirmal", "TS/035/G/1", gmc("nirmal")],
  [9452, "Government Medical College, Rajanna Sircilla", "Telangana", G, "Sircilla", "Rajanna Sircilla", "TS/038/G/1", gmc("sircilla")],
  [9453, "Government Medical College, Sangareddy", "Telangana", G, "Sangareddy", "Sangareddy", "TS/040/G/1", gmc("sangareddy")],
  [9454, "Government Medical College, Wanaparthy", "Telangana", G, "Wanaparthy", "Wanaparthy", "TS/043/G/1", gmc("wanaparthy")],
  // Added the same evening (owner: "banado"): in Dr NTR UHS's Round 2 list; MCC prints it with its address.
  [9403, "Government Medical College, Paderu", "Andhra Pradesh", G, "Paderu", "Alluri Sitharama Raju", "AP/014/G/1", gmc("paderu")],
];
// The muddled MCC row ("The Nilgiris" in Telangana) stays unmatched for both colleges it could be.
const otherState = { "Tamil Nadu": "%telangana%", Telangana: "%nilgiris%", Rajasthan: "%xxxx%", Karnataka: "%xxxx%", "Andhra Pradesh": "%xxxx%" };

const slugify = (s) =>
  s.toLowerCase().replace(/&/g, " ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 170);

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

if (restore) {
  const b = JSON.parse(readFileSync(restore, "utf8"));
  await sql.begin(async (tx) => {
    await tx`UPDATE mcc_seat_matrix SET institute_id = NULL, match_confidence = NULL, match_method = NULL WHERE id IN ${tx(b.matrix.length ? b.matrix : [0])}`;
    await tx`UPDATE mcc_allotments SET institute_id = NULL, match_confidence = NULL, match_method = NULL WHERE id IN ${tx(b.allotments.length ? b.allotments : [0])}`;
    await tx`DELETE FROM nmc_institutes WHERE institute_id IN ${tx(b.institutes)}`;
    await tx`UPDATE state_round_cuts SET institute_id = NULL WHERE institute_id IN ${tx(b.institutes)}`;
    await tx`DELETE FROM institutes WHERE id IN ${tx(b.institutes)}`;
  });
  console.log(`restored: removed ${b.institutes.length} institutes and their MCC matches`);
  await sql.end();
  process.exit(0);
}

const out = { institutes: [], matrix: [], allotments: [] };
try {
  await sql.begin(async (tx) => {
    for (const [sid, name, state, own, city, district, code, mccLike] of COLLEGES) {
      const st = (await tx`SELECT id FROM states WHERE name = ${state}`)[0];
      if (!st) throw new Error(`no state ${state}`);
      const had = (await tx`SELECT id, slug FROM institutes WHERE level = 'pg' AND source_id = ${sid}`)[0];
      const nmc = (await tx`
        SELECT MIN(university_name) AS uni, MIN(inception_year) FILTER (WHERE course_type = 'M.B.B.S.') AS yr,
               SUM(approved_seat) FILTER (WHERE course_type = 'M.B.B.S.')::int AS mbbs
          FROM nmc_courses WHERE college_code = ${code}`)[0];
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
      if (!(await tx`SELECT 1 FROM nmc_institutes WHERE institute_id = ${id}`).length)
        await tx`INSERT INTO nmc_institutes (college_code, institute_id, method, level, updated_at) VALUES (${code}, ${id}, 'admin', 'pg', now())`;
      let m = [];
      let a = [];
      if (mccLike) {
        const skip = otherState[state];
        m = await tx`
          UPDATE mcc_seat_matrix SET institute_id = ${id}, match_confidence = 1, match_method = 'admin-2026-11-25'
           WHERE institute_id IS NULL AND year = 2026 AND mcc_college_name ILIKE ${mccLike} AND mcc_college_name NOT ILIKE ${skip}
             AND (state IS NULL OR state = ${state}) AND seat_matrix <> 'DNB'
          RETURNING id`;
        a = await tx`
          UPDATE mcc_allotments SET institute_id = ${id}, match_confidence = 1, match_method = 'admin-2026-11-25'
           WHERE institute_id IS NULL AND year = 2026 AND mcc_college_name ILIKE ${mccLike} AND mcc_college_name NOT ILIKE ${skip}
             AND (state IS NULL OR state = ${state}) AND mcc_course !~* '^(DNB|\\(NBEMS)'
          RETURNING id`;
        out.matrix.push(...m.map((r) => r.id));
        out.allotments.push(...a.map((r) => r.id));
      }
      console.log(`${had ? "kept   " : "created"} ${String(id).padStart(5)} ${sid} ${slug} | NMC ${code} | MCC matrix ${m.length}, allotments ${a.length}`);
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
