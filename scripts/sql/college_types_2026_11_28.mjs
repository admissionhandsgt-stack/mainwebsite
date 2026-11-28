/**
 * Every college's type — government, private or deemed — checked against two sources (owner, 2026-11-28: "sare colleges
 * ki mapping ekdum ache se double verification ke validate karo kuch galat to nahi hai", after a deemed college showed as
 * private). Writes `institutes.ownership`, which college pages, the FAQ, fee and city tables and the predictor read.
 *
 * Sources: NMC's register (management: Government / Private / Trust; the affiliating university — NMC files every deemed
 * university as "Private"), MCC's NEET UG results (the "Deemed UG" counselling) and MCC's NEET PG 2026 seat matrix (the
 * Deemed matrix's paid, NRI and minority seats — not its one Aligarh Muslim University row).
 *
 *  MBBS (UG institutes on NMC's register; dental and AYUSH colleges are not on it and stay "other"):
 *    deemed      MCC allotted its MBBS seats in the deemed counselling (2026, else 2025 if it had no 2026 rows) AND a second
 *                source: NMC's university is a deemed one, or the same college's PG seats are in MCC's 2026 Deemed matrix.
 *    government  NMC says Government (and not deemed).
 *    private     NMC says Private or Trust (and not deemed).
 *    One deemed source alone is listed for review, never written.
 *  PG:
 *    deemed      MCC's 2026 Deemed matrix AND a second source (NMC's university is deemed, or the MBBS side was allotted
 *                in MCC's deemed counselling).
 *    government  NMC says Government while ours says private or other (Gujarat's GMERS and municipal colleges, the armed
 *                forces' institutions) — except where NMC's field is known wrong (NMC_WRONG).
 *    NMC private against ours government is listed for review, never written.
 *  Pairings: District Hospital, Palakkad (364, a DNB hospital) was auto-paired with P K Das Institute's NMC code; that
 *  pairing is removed and P K Das's own MD/MS entry (1984) takes it.
 *
 *   node --env-file=.env.local scripts/sql/college_types_2026_11_28.mjs            # dry run: every change + review list
 *   node --env-file=.env.local scripts/sql/college_types_2026_11_28.mjs --apply --backup <file>
 *   node --env-file=.env.local scripts/sql/college_types_2026_11_28.mjs --restore <file>
 */
import { readFileSync, writeFileSync } from "node:fs";
import postgres from "postgres";

const args = process.argv.slice(2);
const opt = (n) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const apply = args.includes("--apply");
const backup = opt("--backup");
const restore = opt("--restore");
if (apply && !backup) throw new Error("--apply needs --backup <file>");

/** NMC codes whose management field is wrong: Bombay Hospital Institute is a private trust hospital. */
const NMC_WRONG = { "PG/MH/03/G/1": "private" };
const PAIR_DROP = [{ institute_id: 364, college_code: "KL/029/P/3" }];
const PAIR_ADD = [{ institute_id: 1984, college_code: "KL/029/P/3", level: "pg" }];
const DEEMED_QUOTAS = ["Self-Financed Merit Seat", "Non-Resident Indian", "Jain Minority Quota", "Muslim Minority Quota"];

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

if (restore) {
  const b = JSON.parse(readFileSync(restore, "utf8"));
  await sql.begin(async (tx) => {
    for (const c of b.changes) await tx`UPDATE institutes SET ownership = ${c.from} WHERE id = ${c.id}`;
    for (const p of b.added) await tx`DELETE FROM nmc_institutes WHERE id = ${p.id}`;
    for (const p of b.dropped)
      await tx`INSERT INTO nmc_institutes (college_code, institute_id, method, level, updated_at) VALUES (${p.college_code}, ${p.institute_id}, ${p.method}, ${p.level}, now())`;
  });
  console.log(`restored ${b.changes.length} types, ${b.added.length} pairings removed, ${b.dropped.length} put back`);
  await sql.end();
  process.exit(0);
}

const rows = await sql`
  WITH nmc AS (
    SELECT n.institute_id, MIN(c.college_code) code, MIN(c.management_type) mgmt, MIN(c.university_name) uni
      FROM nmc_institutes n JOIN nmc_courses c ON c.college_code = n.college_code
     WHERE n.institute_id IS NOT NULL GROUP BY n.institute_id),
  pgdeemed AS (
    SELECT DISTINCT institute_id FROM mcc_seat_matrix
     WHERE year = 2026 AND seat_matrix = 'Deemed' AND quota IN ${sql(DEEMED_QUOTAS)} AND institute_id IS NOT NULL),
  ugyear AS (
    SELECT cr.institute_id, MAX(cr.year) y FROM closing_ranks cr WHERE cr.level = 'ug' AND cr.year IN (2025, 2026) GROUP BY 1),
  ugdeemed AS (
    SELECT DISTINCT cr.institute_id FROM closing_ranks cr JOIN counsellings co ON co.id = cr.counselling_id
      JOIN ugyear u ON u.institute_id = cr.institute_id AND u.y = cr.year
     WHERE cr.level = 'ug' AND co.name ILIKE 'Deemed%'),
  terms AS (SELECT institute_id, mode() WITHIN GROUP (ORDER BY institute_type) itype FROM pg_seat_terms GROUP BY 1)
  SELECT i.id, i.level, i.name, i.ownership::text own, nmc.code, nmc.mgmt, nmc.uni, terms.itype,
         (i.id IN (SELECT institute_id FROM pgdeemed)) pg_deemed_self,
         (i.id IN (SELECT institute_id FROM ugdeemed)) ug_deemed_self
    FROM institutes i LEFT JOIN nmc ON nmc.institute_id = i.id LEFT JOIN terms ON terms.institute_id = i.id
   WHERE i.is_active`;

// The other level's evidence for the same NMC college.
const byCode = new Map();
for (const r of rows) if (r.code) (byCode.get(r.code) ?? byCode.set(r.code, []).get(r.code)).push(r);
const twinPgDeemed = (r) => (byCode.get(r.code) ?? []).some((x) => x.level === "pg" && x.pg_deemed_self);
const twinUgDeemed = (r) => (byCode.get(r.code) ?? []).some((x) => x.level === "ug" && x.ug_deemed_self);
const uniDeemed = (r) => /deemed/i.test(r.uni ?? "");
const dropped = new Set(PAIR_DROP.map((p) => p.institute_id));

const changes = [];
const review = [];
for (const r of rows) {
  if (dropped.has(r.id)) continue; // its NMC record is another college's
  const mgmt = (NMC_WRONG[r.code] ?? r.mgmt ?? "").toLowerCase();
  let to = null;
  let why = "";
  if (r.level === "ug") {
    if (!r.code) continue;
    const second = uniDeemed(r) || twinPgDeemed(r);
    if (r.ug_deemed_self && second) (to = "deemed"), (why = `MCC deemed counselling + ${uniDeemed(r) ? "NMC deemed university" : "PG seats in MCC's Deemed matrix"}`);
    else if (r.ug_deemed_self) review.push({ r, note: "MCC deemed counselling only — NMC's university is not a deemed one and no PG deemed seats" });
    else if (mgmt === "government") (to = "government"), (why = "NMC: Government");
    else if (mgmt === "private" || mgmt === "trust") {
      to = "private";
      why = `NMC: ${r.mgmt}`;
      if (uniDeemed(r)) review.push({ r, note: "NMC names a deemed university but MCC did not allot its MBBS seats as deemed — written as private" });
    }
  } else {
    if (r.pg_deemed_self) {
      if (r.own !== "deemed") {
        if (uniDeemed(r) || twinUgDeemed(r)) (to = "deemed"), (why = `MCC 2026 Deemed matrix + ${uniDeemed(r) ? "NMC deemed university" : "MBBS seats in MCC's deemed counselling"}`);
        else review.push({ r, note: "MCC 2026 Deemed matrix only" });
      }
    } else if (r.own === "deemed") {
      review.push({ r, note: "ours deemed, but no seat in MCC's 2026 Deemed matrix" });
    } else if (mgmt === "government" && (r.own === "private" || r.own === "other")) (to = "government"), (why = `NMC: Government${NMC_WRONG[r.code] ? "" : ""}`);
    // A DNB hospital NMC does not list, typed "other": government where NBEMS's own type says so (public sector, railway,
    // ESIC, municipal) or it is an armed forces hospital — the counsellor tool (from NBEMS / MCC) agrees on every one (zyn-27,
    // 2026-11-28, 19 hospitals).
    else if (!r.code && r.own === "other" && (/^NBE - (Government|Public Sector) Institute$|AFMS/.test(r.itype ?? "") || /\b(Command Hospital|Air Force Hospital|Base Hospital|Army Hospital)\b/i.test(r.name)))
      (to = "government"), (why = `NBEMS: ${r.itype ?? "armed forces hospital"}`);
    else if ((mgmt === "private" || mgmt === "trust") && r.own === "government" && !uniDeemed(r)) review.push({ r, note: `NMC: ${r.mgmt}, ours government — left` });
  }
  if (to && to !== r.own) changes.push({ id: r.id, level: r.level, name: r.name, from: r.own, to, why });
}

const count = (xs, k) => xs.reduce((m, x) => ((m[k(x)] = (m[k(x)] ?? 0) + 1), m), {});
console.log("changes by level and type:", JSON.stringify(count(changes, (c) => `${c.level} ${c.from}→${c.to}`)));
for (const c of changes.filter((c) => !(c.level === "ug" && c.to !== "deemed")))
  console.log(`  ${c.level} ${c.id} ${c.name.slice(0, 70)}: ${c.from} → ${c.to} (${c.why})`);
console.log(`  (+ ${changes.filter((c) => c.level === "ug" && c.to !== "deemed").length} MBBS colleges given NMC's government / private)`);
console.log(`\nreview (not written): ${review.length}`);
for (const { r, note } of review) console.log(`  ${r.level} ${r.id} ${r.name.slice(0, 70)} [own=${r.own} nmc=${r.mgmt ?? "-"} uni=${(r.uni ?? "-").slice(0, 45)}]: ${note}`);

const out = { changes, added: [], dropped: [] };
try {
  await sql.begin(async (tx) => {
    for (const c of changes) await tx`UPDATE institutes SET ownership = ${c.to}, updated_at = now() WHERE id = ${c.id}`;
    for (const p of PAIR_DROP) {
      const d = await tx`DELETE FROM nmc_institutes WHERE institute_id = ${p.institute_id} AND college_code = ${p.college_code} RETURNING college_code, institute_id, method, level`;
      out.dropped.push(...d);
    }
    for (const p of PAIR_ADD) {
      if ((await tx`SELECT 1 FROM nmc_institutes WHERE institute_id = ${p.institute_id}`).length) continue;
      const a = await tx`INSERT INTO nmc_institutes (college_code, institute_id, method, level, updated_at) VALUES (${p.college_code}, ${p.institute_id}, 'admin', ${p.level}, now()) RETURNING id`;
      out.added.push(...a);
    }
    console.log(`\npairings: dropped ${out.dropped.length}, added ${out.added.length}`);
    if (!apply) throw new Error("dry run — rolled back");
    writeFileSync(backup, JSON.stringify(out, null, 1));
    console.log(`applied; undo with --restore ${backup}`);
  });
} catch (e) {
  if (!String(e.message).startsWith("dry run")) throw e;
  console.log("(dry run — nothing written; pass --apply --backup <file>)");
}
await sql.end();
