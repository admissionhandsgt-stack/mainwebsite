/**
 * Import the NEET counselling extract (SQLite) into PostgreSQL.
 *
 *   node scripts/import_neetpg.mjs --db "D:/Zyn/data/app/neetpg_app.db" --level pg
 *   node scripts/import_neetpg.mjs --db "..." --level pg --dry-run
 *
 * Idempotent: masters are upserted on their natural key, and closing_ranks /
 * fees for the levels being imported are replaced wholesale, so re-running
 * after a source refresh converges rather than duplicating.
 *
 * Reads DATABASE_URL from the environment or .env.local.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { DatabaseSync } from "node:sqlite";
import postgres from "postgres";

/* ----------------------------- args & env ----------------------------- */

const args = process.argv.slice(2);
const argOf = (flag, fallback = null) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : fallback;
};
const SQLITE_PATH = argOf("--db", "D:/Zyn/data/app/neetpg_app.db");
const LEVEL = argOf("--level", "pg");
const DRY_RUN = args.includes("--dry-run");
const BATCH = Number(argOf("--batch", "2000"));

if (!["ug", "pg"].includes(LEVEL)) {
  console.error(`--level must be 'ug' or 'pg' (got '${LEVEL}')`);
  process.exit(1);
}
if (!fs.existsSync(SQLITE_PATH)) {
  console.error(`SQLite file not found: ${SQLITE_PATH}`);
  process.exit(1);
}

function loadEnv() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

const DATABASE_URL = loadEnv();
if (!DATABASE_URL && !DRY_RUN) {
  console.error("DATABASE_URL is not set. Put it in .env.local or the environment.");
  process.exit(1);
}

/* ------------------------------ helpers ------------------------------ */

const slugify = (s, max = 160) =>
  String(s ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, max)
    .replace(/^-|-$/g, "") || "unknown";

/** Source strings vary a lot; fold them into the ownership enum. */
function ownershipOf(raw) {
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("aiims")) return "aiims";
  if (s.includes("jipmer")) return "jipmer";
  if (s.includes("esic")) return "esic";
  if (s.includes("deemed")) return "deemed";
  if (s.includes("central")) return "central";
  if (s.includes("government") || s.includes("govt")) return "government";
  if (s.includes("private") || s.includes("trust") || s.includes("society")) return "private";
  return "other";
}

/** 'R2' / 'Round 2' / 'Mop-Up' → a sortable integer where possible. */
function roundNumber(label) {
  const m = String(label ?? "").match(/(\d+)/);
  if (m) return Number(m[1]);
  const s = String(label ?? "").toLowerCase();
  if (s.includes("mop")) return 5;
  if (s.includes("stray")) return 6;
  return null;
}

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
const int = (v) => {
  const n = num(v);
  return n === null || Number.isNaN(n) ? null : Math.round(n);
};

/* ------------------------------- read -------------------------------- */

console.log(`\nSource : ${SQLITE_PATH}`);
console.log(`Level  : ${LEVEL}`);
console.log(`Mode   : ${DRY_RUN ? "DRY RUN (nothing is written)" : "WRITE"}\n`);

const sqlite = new DatabaseSync(SQLITE_PATH, { readOnly: true });
const all = (q) => sqlite.prepare(q).all();

const srcRanks = all(`
  SELECT counselling_id, counselling, state_group, state, institute_id, institute,
         institute_type, district, course_id, course, degree_type, course_type,
         quota, quota_full, master_quota, category_raw, vertical_category, is_pwd,
         category_scheme, category_display, rank_type, fee_inr, bond_years, beds,
         year, round, round_label, closing_rank, ai_rank, counselling_rank,
         seats_allotted, rank_basis, low_confidence, extracted_at
  FROM closing_ranks
`);
console.log(`closing_ranks read: ${srcRanks.length.toLocaleString()}`);

const srcColleges = all(`
  SELECT cid, name, type, state, city, est_year, beds, mbbs_intake,
         pg_seats_2025, pg_branches, nmc_university, nmc_management, nmc_district
  FROM colleges
`);
console.log(`colleges read     : ${srcColleges.length.toLocaleString()}`);

const srcFees = all(`
  SELECT institute_id, institute, course_id, course, quota, master_quota, counselling_id,
         fee_session, fee_inr, fee_periodicity, fee_usd, fee_null_reason,
         hostel_fee_min_inr, hostel_fee_max_inr, hostel_fee_note,
         stipend_y1_inr, stipend_y2_inr, stipend_y3_inr, stipend_periodicity,
         fee_info_year, fee_is_carried_forward
  FROM fees
`);
console.log(`fees read         : ${srcFees.length.toLocaleString()}\n`);

/* ---------------------------- build masters --------------------------- */

const states = new Map();      // name -> {name, slug}
const institutes = new Map();  // sourceId -> row
const courses = new Map();     // sourceId -> row
const counsellings = new Map();
const quotas = new Map();      // code -> row
const categories = new Map();  // code|scheme -> row

const collegeByName = new Map(srcColleges.map((c) => [String(c.name || "").trim(), c]));

for (const r of srcRanks) {
  if (r.state && !states.has(r.state)) {
    states.set(r.state, { name: r.state, slug: slugify(r.state, 64) });
  }

  if (r.institute_id != null && !institutes.has(r.institute_id)) {
    const extra = collegeByName.get(String(r.institute || "").trim()) ?? {};
    institutes.set(r.institute_id, {
      sourceId: r.institute_id,
      name: r.institute,
      slug: slugify(r.institute, 180),
      level: LEVEL,
      ownership: ownershipOf(r.institute_type ?? extra.type),
      stateName: r.state ?? extra.state ?? null,
      district: r.district ?? extra.nmc_district ?? null,
      city: extra.city ?? null,
      university: extra.nmc_university ?? null,
      management: extra.nmc_management ?? null,
      establishedYear: int(extra.est_year),
      beds: int(r.beds ?? extra.beds),
      seatsTotal: int(extra.pg_seats_2025),
      branchCount: int(extra.pg_branches),
      mbbsIntake: int(extra.mbbs_intake),
    });
  }

  if (r.course_id != null && !courses.has(r.course_id)) {
    courses.set(r.course_id, {
      sourceId: r.course_id,
      name: r.course,
      slug: slugify(r.course, 160),
      level: LEVEL,
      degreeType: r.degree_type ?? null,
      courseType: r.course_type ?? null,
    });
  }

  if (r.counselling_id != null && !counsellings.has(r.counselling_id)) {
    counsellings.set(r.counselling_id, {
      sourceId: r.counselling_id,
      name: r.counselling,
      slug: slugify(`${r.counselling}-${LEVEL}`, 120),
      level: LEVEL,
      stateGroup: r.state_group ?? null,
      stateName: r.state ?? null,
    });
  }

  const qCode = r.quota ?? r.master_quota;
  if (qCode && !quotas.has(qCode)) {
    quotas.set(qCode, { code: String(qCode).slice(0, 48), label: r.quota_full ?? qCode, masterQuota: r.master_quota ?? null });
  }

  const cCode = r.category_display ?? r.category_raw;
  const scheme = r.category_scheme ?? null;
  const key = `${cCode}|${scheme ?? ""}`;
  if (cCode && !categories.has(key)) {
    categories.set(key, {
      code: String(cCode).slice(0, 48),
      label: r.category_raw ?? cCode,
      verticalCategory: r.vertical_category ?? null,
      isPwd: Boolean(r.is_pwd),
      scheme,
    });
  }
}

console.log("Masters resolved:");
console.log(`  states        ${states.size}`);
console.log(`  institutes    ${institutes.size}`);
console.log(`  courses       ${courses.size}`);
console.log(`  counsellings  ${counsellings.size}`);
console.log(`  quotas        ${quotas.size}`);
console.log(`  categories    ${categories.size}\n`);

// Slug collisions would silently drop rows on the unique index — catch them here.
const seen = new Map();
let collisions = 0;
for (const i of institutes.values()) {
  if (seen.has(i.slug)) {
    collisions++;
    i.slug = `${i.slug}-${i.sourceId}`.slice(0, 180);
  } else seen.set(i.slug, i.sourceId);
}
if (collisions) console.log(`Institute slug collisions disambiguated: ${collisions}\n`);

if (DRY_RUN) {
  const withRank = srcRanks.filter((r) => r.closing_rank != null).length;
  const years = [...new Set(srcRanks.map((r) => r.year))].sort();
  console.log("Fact rows that would be written:");
  console.log(`  closing_ranks ${srcRanks.length.toLocaleString()} (${withRank.toLocaleString()} with a rank)`);
  console.log(`  fees          ${srcFees.length.toLocaleString()}`);
  console.log(`  years         ${years.join(", ")}`);
  console.log("\nDry run complete — nothing was written.");
  sqlite.close();
  process.exit(0);
}

/* ------------------------------- write ------------------------------- */

const sql = postgres(DATABASE_URL, { max: 4, prepare: false, onnotice: () => {} });

async function upsertReturningIds(table, rows, conflictCols, keyOf) {
  const map = new Map();
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const inserted = await sql`
      INSERT INTO ${sql(table)} ${sql(chunk)}
      ON CONFLICT (${sql(conflictCols)}) DO UPDATE SET ${sql(conflictCols[0])} = EXCLUDED.${sql(conflictCols[0])}
      RETURNING *
    `;
    for (const row of inserted) map.set(keyOf(row), row.id);
  }
  return map;
}

try {
  console.log("Writing masters…");

  const stateRows = [...states.values()];
  const stateIds = await upsertReturningIds("states", stateRows, ["slug"], (r) => r.slug);

  const quotaRows = [...quotas.values()].map((q) => ({
    code: q.code, label: q.label, master_quota: q.masterQuota,
  }));
  const quotaIds = await upsertReturningIds("quotas", quotaRows, ["code"], (r) => r.code);

  const catRows = [...categories.values()].map((c) => ({
    code: c.code, label: c.label, vertical_category: c.verticalCategory,
    is_pwd: c.isPwd, scheme: c.scheme,
  }));
  const catIds = await upsertReturningIds(
    "categories", catRows, ["code", "scheme"], (r) => `${r.code}|${r.scheme ?? ""}`,
  );

  const counsRows = [...counsellings.values()].map((c) => ({
    source_id: c.sourceId, name: c.name, slug: c.slug, level: c.level,
    state_group: c.stateGroup, state_id: c.stateName ? stateIds.get(slugify(c.stateName, 64)) ?? null : null,
  }));
  const counsIds = await upsertReturningIds("counsellings", counsRows, ["slug"], (r) => r.slug);

  const courseRows = [...courses.values()].map((c) => ({
    source_id: c.sourceId, name: c.name, short_name: c.shortName ?? null, slug: c.slug,
    level: c.level, degree_type: c.degreeType, course_type: c.courseType,
  }));
  const courseIds = await upsertReturningIds(
    "courses", courseRows, ["slug", "level"], (r) => `${r.slug}|${r.level}`,
  );

  const instRows = [...institutes.values()].map((i) => ({
    source_id: i.sourceId, name: i.name, slug: i.slug, level: i.level, ownership: i.ownership,
    state_id: i.stateName ? stateIds.get(slugify(i.stateName, 64)) ?? null : null,
    district: i.district, city: i.city, university: i.university, management: i.management,
    established_year: i.establishedYear, beds: i.beds, seats_total: i.seatsTotal,
    branch_count: i.branchCount, mbbs_intake: i.mbbsIntake,
  }));
  const instIds = await upsertReturningIds("institutes", instRows, ["slug"], (r) => r.slug);

  console.log("  masters written\n");

  // Facts are replaced for this level so a re-import converges.
  console.log(`Replacing facts for level '${LEVEL}'…`);
  await sql`DELETE FROM closing_ranks WHERE level = ${LEVEL}`;
  await sql`DELETE FROM fees WHERE level = ${LEVEL}`;

  const instBySource = new Map([...institutes.values()].map((i) => [i.sourceId, instIds.get(i.slug)]));
  const courseBySource = new Map([...courses.values()].map((c) => [c.sourceId, courseIds.get(`${c.slug}|${c.level}`)]));
  const counsBySource = new Map([...counsellings.values()].map((c) => [c.sourceId, counsIds.get(c.slug)]));

  let written = 0;
  for (let i = 0; i < srcRanks.length; i += BATCH) {
    const chunk = srcRanks.slice(i, i + BATCH).map((r) => ({
      level: LEVEL,
      counselling_id: counsBySource.get(r.counselling_id) ?? null,
      institute_id: instBySource.get(r.institute_id) ?? null,
      course_id: courseBySource.get(r.course_id) ?? null,
      quota_id: quotaIds.get(String(r.quota ?? r.master_quota ?? "").slice(0, 48)) ?? null,
      category_id: catIds.get(`${String(r.category_display ?? r.category_raw ?? "").slice(0, 48)}|${r.category_scheme ?? ""}`) ?? null,
      year: int(r.year),
      round: roundNumber(r.round_label ?? r.round),
      round_label: r.round_label ? String(r.round_label).slice(0, 24) : null,
      closing_rank: int(r.closing_rank),
      ai_rank: int(r.ai_rank),
      counselling_rank: int(r.counselling_rank),
      seats_allotted: int(r.seats_allotted),
      fee_inr: num(r.fee_inr),
      bond_years: num(r.bond_years),
      low_confidence: Boolean(r.low_confidence),
      rank_basis: r.rank_basis ?? null,
      extracted_at: r.extracted_at ? new Date(r.extracted_at) : null,
    }));
    await sql`INSERT INTO closing_ranks ${sql(chunk)}`;
    written += chunk.length;
    if (written % 20000 === 0 || written === srcRanks.length) {
      process.stdout.write(`\r  closing_ranks ${written.toLocaleString()} / ${srcRanks.length.toLocaleString()}`);
    }
  }
  console.log();

  let feesWritten = 0;
  for (let i = 0; i < srcFees.length; i += BATCH) {
    const chunk = srcFees.slice(i, i + BATCH).map((f) => ({
      level: LEVEL,
      institute_id: instBySource.get(f.institute_id) ?? null,
      course_id: courseBySource.get(f.course_id) ?? null,
      quota_id: quotaIds.get(String(f.quota ?? f.master_quota ?? "").slice(0, 48)) ?? null,
      counselling_id: counsBySource.get(f.counselling_id) ?? null,
      fee_session: f.fee_session ?? null,
      fee_inr: num(f.fee_inr),
      fee_periodicity: f.fee_periodicity ?? null,
      fee_usd: num(f.fee_usd),
      fee_null_reason: f.fee_null_reason ?? null,
      hostel_min_inr: num(f.hostel_fee_min_inr),
      hostel_max_inr: num(f.hostel_fee_max_inr),
      hostel_note: f.hostel_fee_note ?? null,
      stipend_y1_inr: num(f.stipend_y1_inr),
      stipend_y2_inr: num(f.stipend_y2_inr),
      stipend_y3_inr: num(f.stipend_y3_inr),
      stipend_periodicity: f.stipend_periodicity ?? null,
      year: int(f.fee_info_year),
      is_carried_forward: Boolean(f.fee_is_carried_forward),
    }));
    await sql`INSERT INTO fees ${sql(chunk)}`;
    feesWritten += chunk.length;
  }
  console.log(`  fees ${feesWritten.toLocaleString()}\n`);

  const [{ count: rankCount }] = await sql`SELECT COUNT(*)::int AS count FROM closing_ranks WHERE level = ${LEVEL}`;
  const [{ count: instCount }] = await sql`SELECT COUNT(*)::int AS count FROM institutes WHERE level = ${LEVEL}`;
  console.log("Verification:");
  console.log(`  closing_ranks in Postgres : ${rankCount.toLocaleString()} (source ${srcRanks.length.toLocaleString()})`);
  console.log(`  institutes in Postgres    : ${instCount.toLocaleString()}`);
  console.log(rankCount === srcRanks.length ? "\n  Row counts match.\n" : "\n  ROW COUNTS DIFFER — investigate before using this data.\n");
} finally {
  await sql.end({ timeout: 5 });
  sqlite.close();
}
