/**
 * Imports the UG (NEET-UG) dataset from the authenticated scrape.
 *
 *   node scripts/import_ug_scrape.mjs --dry-run   # report only, writes nothing
 *   node scripts/import_ug_scrape.mjs             # import
 *
 * Sources, and why each is used for what:
 *
 *   details/*.html   1,727 college pages. Each carries the college's name,
 *                    state and establishment year, a "Cutoff UG 2025" table
 *                    (~42,700 rows with quota, category, counselling, round,
 *                    score and closing rank) and its fee schedules.
 *                    -> institutes, and all of 2025's closing ranks.
 *
 *   pages/*.html     152 list pages. Their rank tables are the only place the
 *                    2026 R1/R2 closing ranks appear.
 *                    -> 2026 closing ranks only. Their 2025 columns are
 *                       ignored: the detail pages cover the same year with far
 *                       more rows, and taking both would double-count.
 *
 * Safety properties:
 *   - Only `level = 'ug'` rows are ever deleted. PG data is never touched.
 *   - Masters shared with PG (states, quotas, categories) are insert-only.
 *   - Re-running produces the same result; UG facts are replaced wholesale.
 *   - Every stage prints counts, and the run fails loudly rather than
 *     importing a partial or shifted dataset.
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import { config } from "dotenv";
import { parseDetailPage } from "./lib/parseUgDetails.mjs";
import { readUgPages, num, money, blank } from "./lib/parseUgPages.mjs";

config({ path: ".env.local" });

const ROOT = "D:/Gulshan/PG/Website/extracted-data/ug-live";
const DETAILS = path.join(ROOT, "details");
const LISTS = path.join(ROOT, "pages");

const DRY = process.argv.includes("--dry-run");
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

const log = (...a) => console.log(...a);
const step = (s) => log(`\n── ${s}`);

/* ------------------------------ helpers ------------------------------ */

/**
 * Slugs are capped to the column they land in.
 *
 * Nine college names slugify past 180 characters, which is what
 * `institutes.slug` holds. Truncating a slug is safe — it is an addressing
 * key, and collisions are resolved by appending the source id. Truncating a
 * *code* would not be: two distinct categories could collapse into one, so
 * those are validated instead of trimmed.
 */
const slugify = (s, max = 190) =>
  String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, max)
    .replace(/-+$/, "");

/** Fails loudly rather than letting Postgres truncate or reject silently. */
function assertFits(values, max, what) {
  const over = [...values].filter((v) => v && String(v).length > max);
  if (over.length) {
    throw new Error(
      `${over.length} ${what} exceed ${max} characters, e.g. ${JSON.stringify(
        String(over[0]).slice(0, 60),
      )} (${String(over[0]).length}). Widen the column or shorten the value — do not truncate a code.`,
    );
  }
}

/** Title-cases a SHOUTED state name without mangling "and". */
const titleCase = (s) =>
  String(s)
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/g, "and");

const normState = (s) => titleCase(String(s ?? "").trim());

/**
 * Round label to (sortable number, label).
 *
 * The numbered rounds keep their own number. The named rounds are pushed well
 * past them so ordering still works, and keep a readable label — the
 * `seat_options` view only special-cases 'R1'.
 */
function parseRound(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = s.match(/^round\s*(\d+)$/i);
  if (n) return { round: Number(n[1]), label: `R${n[1]}` };
  if (/^mop\s*up\s*2$/i.test(s) || /^mopup\s*2$/i.test(s)) return { round: 21, label: "MOPUP2" };
  if (/^mop\s*-?\s*up$/i.test(s) || /^mopup$/i.test(s)) return { round: 20, label: "MOPUP" };
  if (/^stray/i.test(s)) return { round: 30, label: "STRAY" };
  if (/^final/i.test(s)) return { round: 40, label: "FINAL" };
  return null;
}

/**
 * Whether a counselling's ranks are all-India ranks.
 *
 * NEET-UG has one national exam, but state authorities publish their own merit
 * ranks. Labelling the basis honestly matters: a state rank of 5,000 and an
 * all-India rank of 5,000 are not the same seat.
 */
const isAllIndiaBasis = (counselling) =>
  !/^state$/i.test(String(counselling ?? "").trim());

/* --------------------------- read the source --------------------------- */

step("reading the scrape");

const detailFiles = (await readdir(DETAILS)).filter((f) => f.endsWith(".html"));
const colleges = [];
const cutoffs2025 = [];
const feeBlocks = [];

for (const file of detailFiles) {
  const id = Number(path.basename(file, ".html"));
  const page = parseDetailPage(await readFile(path.join(DETAILS, file), "utf8"), id);

  if (!page.name || !page.state) {
    throw new Error(`${file}: missing name or state — the page layout changed`);
  }

  colleges.push({
    sourceId: id,
    name: page.name,
    state: normState(page.state),
    established: page.established,
  });

  for (const c of page.cutoffs) {
    if (c.year !== 2025) continue;
    const round = parseRound(c.round);
    if (!round) continue;
    if (!c.course || !c.category || !c.quota) continue;
    cutoffs2025.push({ ...c, ...round });
  }

  // One fee figure per block: the first-year amount, which is the annual
  // tuition the source headlines. The later years repeat or taper it.
  const firstYear = new Map();
  for (const f of page.fees) {
    if (!/^1st year$/i.test(f.item)) continue;
    if (!firstYear.has(f.block)) firstYear.set(f.block, f.amount);
  }
  for (const [block, amount] of firstYear) {
    feeBlocks.push({ sourceId: id, block, amount });
  }
}

log(`  colleges      ${colleges.length.toLocaleString("en-IN")}`);
log(`  2025 cutoffs  ${cutoffs2025.length.toLocaleString("en-IN")}`);
log(`  fee blocks    ${feeBlocks.length.toLocaleString("en-IN")}`);

const listRows = await readUgPages(LISTS);
const rankRows = listRows.filter((r) => r._kind === "closing-rank1");
const cutoffRows = listRows.filter((r) => r._kind === "closing-cutoff");

// The rank tables carry no state of their own; the cutoff tables carry both a
// state and the site's state id, so they define the mapping.
const stateOfSiteId = new Map();
for (const r of cutoffRows) {
  if (blank(r.State)) continue;
  const existing = stateOfSiteId.get(r._stateId);
  const name = normState(r.State);
  if (existing && existing !== name) {
    throw new Error(`site state id ${r._stateId} maps to both "${existing}" and "${name}"`);
  }
  stateOfSiteId.set(r._stateId, name);
}

const cutoffs2026 = [];
for (const r of rankRows) {
  const state = stateOfSiteId.get(r._stateId);
  if (!state) continue;
  for (const [col, round, label] of [
    ["CR 2026 R1", 1, "R1"],
    ["CR 2026 R2", 2, "R2"],
  ]) {
    const rank = num(r[col]);
    if (rank === null) continue;
    cutoffs2026.push({
      collegeId: r._collegeId,
      year: 2026,
      course: r.Course,
      quota: r["Cutoff Quota"],
      category: r.Category,
      counselling: r._counselling,
      state,
      round,
      label,
      closingRank: rank,
      score: null,
      fee: money(r.Fees),
    });
  }
}
log(`  2026 cutoffs  ${cutoffs2026.length.toLocaleString("en-IN")}  (from ${rankRows.length} list rows)`);

/* --------------------------- build the masters --------------------------- */

step("mapping to the schema");

const collegeState = new Map(colleges.map((c) => [c.sourceId, c.state]));
// A 2026 row's state comes from the page it was on; prefer the college's own.
for (const c of cutoffs2026) c.state = collegeState.get(c.collegeId) ?? c.state;

const allCutoffs = [
  ...cutoffs2025.map((c) => ({
    collegeId: c.collegeId,
    year: 2025,
    course: c.course,
    quota: c.quota,
    category: c.category,
    counselling: c.counselling,
    state: collegeState.get(c.collegeId),
    round: c.round,
    label: c.label,
    closingRank: c.closingRank,
    score: c.score,
    fee: null,
  })),
  ...cutoffs2026,
];

const orphans = allCutoffs.filter((c) => !collegeState.has(c.collegeId));
if (orphans.length) {
  throw new Error(
    `${orphans.length} cutoff rows reference a college with no detail page (ids: ${[
      ...new Set(orphans.map((o) => o.collegeId)),
    ].slice(0, 8)})`,
  );
}

const stateNames = new Set(colleges.map((c) => c.state));
const courseNames = new Set(allCutoffs.map((c) => c.course).filter(Boolean));
const quotaNames = new Set(allCutoffs.map((c) => c.quota).filter(Boolean));
const categoryNames = new Set(allCutoffs.map((c) => c.category).filter(Boolean));

/**
 * A counselling is "who ran this round".
 *
 * State counselling is per state — Karnataka's rounds are not Kerala's — so it
 * is keyed by state. Everything else is national and keyed by its own name.
 */
function counsellingKey(c) {
  return /^state$/i.test(c.counselling ?? "")
    ? `state:${c.state}`
    : `central:${c.counselling}`;
}
const counsellingKeys = new Map();
for (const c of allCutoffs) {
  if (!c.counselling) continue;
  const key = counsellingKey(c);
  if (!counsellingKeys.has(key)) {
    counsellingKeys.set(
      key,
      /^state$/i.test(c.counselling)
        ? { name: `${c.state} UG`, stateGroup: c.state, state: c.state }
        : { name: `${c.counselling} UG`, stateGroup: "Central", state: null },
    );
  }
}

log(`  states        ${stateNames.size}`);
log(`  courses       ${courseNames.size}  (${[...courseNames].join(", ")})`);
log(`  counsellings  ${counsellingKeys.size}`);
log(`  quotas        ${quotaNames.size}`);
log(`  categories    ${categoryNames.size}`);
log(`  cutoff rows   ${allCutoffs.length.toLocaleString("en-IN")}  (2025: ${cutoffs2025.length.toLocaleString("en-IN")}, 2026: ${cutoffs2026.length.toLocaleString("en-IN")})`);

// Codes are identities, so a value that would not fit is a failure, not a
// trim. Slugs are capped where they are built.
assertFits(quotaNames, 48, "quota codes");
assertFits(categoryNames, 48, "category codes");
assertFits(new Set(allCutoffs.map((c) => c.label)), 24, "round labels");
assertFits(stateNames, 60, "state names");

/* ------------------------------- report ------------------------------- */

const before = {
  institutes: (await sql`SELECT COUNT(*)::int n FROM institutes WHERE level='ug'`)[0].n,
  ranks: (await sql`SELECT COUNT(*)::int n FROM closing_ranks WHERE level='ug'`)[0].n,
  fees: (await sql`SELECT COUNT(*)::int n FROM fees WHERE level='ug'`)[0].n,
  pgRanks: (await sql`SELECT COUNT(*)::int n FROM closing_ranks WHERE level='pg'`)[0].n,
  pgInstitutes: (await sql`SELECT COUNT(*)::int n FROM institutes WHERE level='pg'`)[0].n,
};

step("current database");
log(`  ug institutes ${before.institutes}   ug ranks ${before.ranks}   ug fees ${before.fees}`);
log(`  pg institutes ${before.pgInstitutes}   pg ranks ${before.pgRanks}   (must not change)`);

if (DRY) {
  step("dry run — nothing was written");

  const sample = allCutoffs.slice(0, 3);
  log("\n  sample rows that would be inserted:");
  for (const s of sample) {
    log(
      `    ${s.year} ${s.label.padEnd(6)} ${String(s.closingRank).padStart(8)}  ` +
        `${s.course} | ${s.category} | ${s.quota} | ${s.counselling} | ${s.state}`,
    );
  }

  const byYear = new Map();
  for (const c of allCutoffs) byYear.set(c.year, (byYear.get(c.year) ?? 0) + 1);
  log("\n  rows per year: " + [...byYear].map(([y, n]) => `${y}=${n.toLocaleString("en-IN")}`).join("  "));

  const r1 = allCutoffs.filter((c) => c.label === "R1").length;
  log(`  rows the predictor treats as round 1: ${r1.toLocaleString("en-IN")}`);

  await sql.end();
  process.exit(0);
}

/* ------------------------------- import ------------------------------- */

const t0 = Date.now();

await sql.begin(async (tx) => {
  step("masters");

  /** Inserts only the values that are not already there, in one round trip. */
  const insertMissing = async (table, existing, wanted, build) => {
    const fresh = [...wanted].filter((v) => !existing.has(v));
    if (fresh.length) {
      await tx`INSERT INTO ${tx(table)} ${tx(fresh.map(build))} ON CONFLICT DO NOTHING`;
    }
    return fresh.length;
  };

  // --- states (shared with PG) ---
  let stateId = new Map((await tx`SELECT id, name FROM states`).map((r) => [r.name, r.id]));
  const newStates = await insertMissing("states", stateId, stateNames, (name) => ({
    name,
    slug: slugify(name, 64),
  }));
  stateId = new Map((await tx`SELECT id, name FROM states`).map((r) => [r.name, r.id]));
  const missingStates = [...stateNames].filter((s) => !stateId.has(s));
  if (missingStates.length) throw new Error(`states not resolved: ${missingStates}`);
  log(`  states        ${stateNames.size} needed, ${newStates} new`);

  // --- courses (level-scoped) ---
  let courseId = new Map(
    (await tx`SELECT id, name FROM courses WHERE level='ug'`).map((r) => [r.name, r.id]),
  );
  const newCourses = await insertMissing("courses", courseId, courseNames, (name) => ({
    name,
    slug: slugify(name, 156) + "-ug",
    level: "ug",
  }));
  courseId = new Map(
    (await tx`SELECT id, name FROM courses WHERE level='ug'`).map((r) => [r.name, r.id]),
  );
  log(`  courses       ${courseNames.size} needed, ${newCourses} new`);

  // --- counsellings (level-scoped) ---
  const counsellingSlug = (key) => slugify(key, 116) + "-ug";
  let counsellingId = new Map(
    (await tx`SELECT id, slug FROM counsellings WHERE level='ug'`).map((r) => [r.slug, r.id]),
  );
  const wantedCounsellings = new Set([...counsellingKeys.keys()].map(counsellingSlug));
  const newCounsellings = await insertMissing(
    "counsellings",
    counsellingId,
    wantedCounsellings,
    (slug) => {
      const key = [...counsellingKeys.keys()].find((k) => counsellingSlug(k) === slug);
      const c = counsellingKeys.get(key);
      return {
        name: c.name,
        slug,
        level: "ug",
        state_group: c.stateGroup,
        state_id: c.state ? stateId.get(c.state) ?? null : null,
      };
    },
  );
  counsellingId = new Map(
    (await tx`SELECT id, slug FROM counsellings WHERE level='ug'`).map((r) => [r.slug, r.id]),
  );
  log(`  counsellings  ${wantedCounsellings.size} needed, ${newCounsellings} new`);

  // --- quotas (shared, unique on code) ---
  let quotaId = new Map((await tx`SELECT id, code FROM quotas`).map((r) => [r.code, r.id]));
  const newQuotas = await insertMissing("quotas", quotaId, quotaNames, (code) => ({
    code,
    label: code,
  }));
  quotaId = new Map((await tx`SELECT id, code FROM quotas`).map((r) => [r.code, r.id]));
  log(`  quotas        ${quotaNames.size} needed, ${newQuotas} new`);

  // --- categories (shared) ---
  //
  // The unique index is on (code, scheme), and Postgres treats NULLs in a
  // unique index as distinct — so inserting with a null scheme would add a
  // second 'GEN' beside the existing one, and do it again on every re-run.
  // Reusing any row that already has the code keeps one row per code and makes
  // the import idempotent.
  let categoryId = new Map(
    (await tx`SELECT id, code FROM categories`).map((r) => [r.code, r.id]),
  );
  const newCategories = await insertMissing("categories", categoryId, categoryNames, (code) => ({
    code,
    label: code,
    scheme: "ug_source",
  }));
  categoryId = new Map((await tx`SELECT id, code FROM categories`).map((r) => [r.code, r.id]));
  log(`  categories    ${categoryNames.size} needed, ${newCategories} new`);

  // --- institutes ---
  step("institutes");

  // Two colleges can slugify the same; the source id disambiguates so a slug
  // never silently overwrites another college's row.
  // 174 + "-ug" leaves room for the longest "-<sourceId>" suffix inside 180.
  const baseSlug = (c) => slugify(c.name, 171) + "-ug";
  const slugCount = new Map();
  for (const c of colleges) {
    const base = baseSlug(c);
    slugCount.set(base, (slugCount.get(base) ?? 0) + 1);
  }
  const rowsToWrite = colleges.map((c) => {
    const base = baseSlug(c);
    return {
      source_id: c.sourceId,
      name: c.name,
      slug: slugCount.get(base) > 1 ? `${base}-${c.sourceId}` : base,
      level: "ug",
      state_id: stateId.get(c.state),
      established_year: c.established,
      is_active: true,
    };
  });
  assertFits(rowsToWrite.map((r) => r.slug), 180, "institute slugs");
  const collided = [...slugCount.values()].filter((n) => n > 1).length;
  if (collided) log(`  ${collided} names slugify alike — those rows carry their source id`);

  for (let i = 0; i < rowsToWrite.length; i += 500) {
    await tx`
      INSERT INTO institutes ${tx(rowsToWrite.slice(i, i + 500))}
      ON CONFLICT (slug) DO UPDATE
        SET name = EXCLUDED.name,
            state_id = EXCLUDED.state_id,
            established_year = EXCLUDED.established_year,
            source_id = EXCLUDED.source_id,
            updated_at = now()
    `;
  }
  const instRows = await tx`SELECT id, source_id FROM institutes WHERE level='ug'`;
  const instituteId = new Map(instRows.map((r) => [r.source_id, r.id]));
  log(`  institutes upserted: ${instituteId.size}`);

  // --- closing ranks (replace this level wholesale) ---
  step("closing ranks");
  const deleted = await tx`DELETE FROM closing_ranks WHERE level='ug' RETURNING 1`;
  log(`  cleared ${deleted.length.toLocaleString("en-IN")} existing ug rows`);

  const values = [];
  let skipped = 0;
  for (const c of allCutoffs) {
    const iid = instituteId.get(c.collegeId);
    const cid = courseId.get(c.course);
    const qid = quotaId.get(c.quota);
    const catId = categoryId.get(c.category);
    const cnId = counsellingId.get(counsellingSlug(counsellingKey(c)));
    if (!iid || !cid || !qid || !catId || !cnId) {
      skipped++;
      continue;
    }
    const allIndia = isAllIndiaBasis(c.counselling);
    values.push({
      level: "ug",
      counselling_id: cnId,
      institute_id: iid,
      course_id: cid,
      quota_id: qid,
      category_id: catId,
      year: c.year,
      round: c.round,
      round_label: c.label,
      closing_rank: c.closingRank,
      ai_rank: allIndia ? c.closingRank : null,
      counselling_rank: c.closingRank,
      seats_allotted: null,
      fee_inr: c.fee,
      bond_years: null,
      low_confidence: false,
      rank_basis: allIndia ? "All India Rank" : "State/Counselling rank",
    });
  }
  if (skipped) log(`  skipped ${skipped} rows that could not be resolved to a master`);

  const CHUNK = 2000;
  for (let i = 0; i < values.length; i += CHUNK) {
    await tx`INSERT INTO closing_ranks ${tx(values.slice(i, i + CHUNK))}`;
  }
  log(`  inserted ${values.length.toLocaleString("en-IN")} closing ranks`);

  // --- fees ---
  step("fees");
  const feesDeleted = await tx`DELETE FROM fees WHERE level='ug' RETURNING 1`;
  log(`  cleared ${feesDeleted.length.toLocaleString("en-IN")} existing ug rows`);

  const mbbsId = courseId.get("MBBS") ?? null;
  const feeValues = [];
  for (const f of feeBlocks) {
    const iid = instituteId.get(f.sourceId);
    if (!iid) continue;
    feeValues.push({
      level: "ug",
      institute_id: iid,
      course_id: mbbsId,
      // The source never says which quota a fee block belongs to, so this is
      // left null rather than guessed. Read these as a range per college.
      quota_id: null,
      counselling_id: null,
      fee_session: "2025",
      fee_inr: f.amount,
      fee_periodicity: "per year",
      year: 2025,
      fee_null_reason: null,
      is_carried_forward: false,
    });
  }
  for (let i = 0; i < feeValues.length; i += CHUNK) {
    await tx`INSERT INTO fees ${tx(feeValues.slice(i, i + CHUNK))}`;
  }
  log(`  inserted ${feeValues.length.toLocaleString("en-IN")} fee rows`);
});

/* ------------------------------- verify ------------------------------- */

step("rebuilding seat_options");
await sql`REFRESH MATERIALIZED VIEW seat_options`;

const after = {
  institutes: (await sql`SELECT COUNT(*)::int n FROM institutes WHERE level='ug'`)[0].n,
  ranks: (await sql`SELECT COUNT(*)::int n FROM closing_ranks WHERE level='ug'`)[0].n,
  fees: (await sql`SELECT COUNT(*)::int n FROM fees WHERE level='ug'`)[0].n,
  seats: (await sql`SELECT COUNT(*)::int n FROM seat_options WHERE level='ug'`)[0].n,
  pgRanks: (await sql`SELECT COUNT(*)::int n FROM closing_ranks WHERE level='pg'`)[0].n,
  pgInstitutes: (await sql`SELECT COUNT(*)::int n FROM institutes WHERE level='pg'`)[0].n,
};

step("result");
log(`  ug institutes  ${before.institutes} -> ${after.institutes}`);
log(`  ug ranks       ${before.ranks} -> ${after.ranks.toLocaleString("en-IN")}`);
log(`  ug fees        ${before.fees} -> ${after.fees.toLocaleString("en-IN")}`);
log(`  ug seat options              ${after.seats.toLocaleString("en-IN")}`);
log(`  pg institutes  ${before.pgInstitutes} -> ${after.pgInstitutes}`);
log(`  pg ranks       ${before.pgRanks.toLocaleString("en-IN")} -> ${after.pgRanks.toLocaleString("en-IN")}`);

if (after.pgRanks !== before.pgRanks || after.pgInstitutes !== before.pgInstitutes) {
  throw new Error("PG data changed — it must not. Investigate before trusting this run.");
}
log(`\ndone in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

await sql.end();
