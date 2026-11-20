// New hero pictures on the data pages (2026-11-20, owner: "real doctors type images use karo … young PG age related
// doctors, labs, OTs … ekdum nice clean modern infra"). Ten scenes made with the owner's own Gemini subscription, each
// looked at full size before use, converted to WebP and uploaded under new names (never over an old file). They replace
// the older generic pictures on the 22 `page.*.hero` keys that carried no credit. Photographs of a real, named college
// (the state pages' campus photos, with their credits) are not touched, and neither are the legacy cut-out keys
// (homepage_hero_doctors, pg_hero_doctors).
//
// These are generated scenes, never a named college: alt text describes the scene only, and `subject`, `attribution`
// and `license` stay empty, so no credit chip is drawn (PageHero draws one for a licence alone). Where they came from is
// recorded here; the originals are in D:/Admisson Hands/hero_images_2026_11 (outside the repo).
//
// Guarded: a row is changed only while it still holds the picture it held on 2026-11-20, so a choice made in
// Admin → Media since then is never overwritten. The old rows are written to a backup first.
//   node --env-file=.env.local scripts/sql/hero_photos_2026_11_20.mjs [--apply --backup <file>] | --restore <file>
import fs from "node:fs";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const backupAt = args.includes("--backup") ? args[args.indexOf("--backup") + 1] : null;
const restoreFrom = args.includes("--restore") ? args[args.indexOf("--restore") + 1] : null;
const DIR = "/assets/images/uploads/";

if (restoreFrom) {
  const b = JSON.parse(fs.readFileSync(restoreFrom, "utf8"));
  await sql.begin(async (tx) => {
    for (const r of b.rows) {
      await tx`UPDATE media_assets SET image_url = ${r.image_url}, alt_text = ${r.alt_text}, attribution = ${r.attribution},
        license = ${r.license}, source_url = ${r.source_url}, subject = ${r.subject}, updated_at = now() WHERE id = ${r.id}`;
    }
  });
  console.log(`restored ${b.rows.length} rows`);
  await sql.end();
  process.exit(0);
}

const SCENES = {
  lounge: ["hero-lounge-1795185501372-200f8729.webp", "Two young resident doctors going through an allotment list at a table in a hospital lounge"],
  corridor: ["hero-corridor-1795185501372-fc80e441.webp", "Four young resident doctors walking through a bright hospital corridor"],
  night: ["hero-night-shift-1795185501372-e003564b.webp", "A resident doctor writing case notes at a hospital nursing station on a night shift"],
  library: ["hero-library-1795185501372-48209596.webp", "A young doctor studying with textbooks and notes in a medical college library"],
  lab: ["hero-mbbs-lab-1795185501372-10d3c186.webp", "MBBS students at microscopes and notebooks in a medical college laboratory"],
  ward: ["hero-ward-round-1795185501372-10e865cc.webp", "A resident doctor examining a patient on a hospital ward during rounds"],
  theatre: ["hero-operating-theatre-1795185501372-836c672b.webp", "Two surgical residents operating in a hospital operating theatre"],
  pathology: ["hero-pathology-1795185501372-4d21bfad.webp", "A resident doctor at a microscope in a hospital pathology laboratory"],
  radiology: ["hero-radiology-1795185501372-c1bb7eac.webp", "A resident doctor reading a chest X-ray and CT scans in a radiology reporting room"],
  desk: ["hero-document-desk-1795185501372-e5a08a5f.webp", "A young doctor handing certificates across the counter at a medical college admission office"],
};

// media key -> [scene, the picture the row held on 2026-11-20]
const PLAN = {
  "page.pg_round.hero": ["lounge", "marketing-services_carousel_1.avif"],
  "page.pg_counselling.hero": ["lounge", "marketing-services_carousel_1.avif"],
  "page.private_pg_fees.hero": ["lounge", "marketing-services_carousel_1.avif"],
  "page.quota_management.hero": ["desk", "marketing-services_carousel_1.avif"],
  "page.quota_nri.hero": ["desk", "marketing-services_carousel_1.avif"],
  "page.nri_documents.hero": ["desk", "marketing-services_carousel_1.avif"],
  "page.pg_colleges.hero": ["corridor", "marketing-services_carousel_2.avif"],
  "page.deemed_pg.hero": ["corridor", "marketing-services_carousel_2.avif"],
  "page.nri_colleges.hero": ["corridor", "marketing-services_carousel_2.avif"],
  "page.pg_stipend.hero": ["night", "hero-pg_hero_doctors.avif"],
  "page.stipend_report.hero": ["night", "hero-pg_hero_doctors.avif"],
  "page.neet_pg_cutoff.hero": ["library", "content-neet_exam.avif"],
  "page.neet_ug_cutoff.hero": ["library", "content-neet_exam.avif"],
  "page.ug_state.hero": ["lab", "content-mbbs_doctors_stats.avif"],
  "page.pg_bond.hero": ["ward", "branches-general-medicine.avif"],
  "page.pg_state.hero": ["ward", "branches-general-medicine.avif"],
  "page.pg_states.hero": ["ward", "branches-general-medicine.avif"],
  "page.neet_ss.hero": ["theatre", "branches-general-surgery.avif"],
  "page.neet_ss_course.hero": ["theatre", "branches-general-surgery.avif"],
  "page.pg_seat_matrix.hero": ["pathology", "branches-pathology.avif"],
  "page.pg_branches.hero": ["radiology", "branches-pulmonary-medicine.avif"],
  "page.open_data.hero": ["radiology", "branches-radio-diagnosis.avif"],
};

const keys = Object.keys(PLAN);
const rows = await sql`SELECT id, media_key, image_url, alt_text, attribution, license, source_url, subject, is_active
  FROM media_assets WHERE media_key IN ${sql(keys)} ORDER BY media_key`;
const byKey = new Map(rows.map((r) => [r.media_key, r]));
const todo = [];
for (const key of keys) {
  const [scene, was] = PLAN[key];
  const [file, alt] = SCENES[scene];
  const row = byKey.get(key);
  if (!row) { console.log(`  skip   ${key}: no row`); continue; }
  if (row.image_url === DIR + file) { console.log(`  done   ${key}`); continue; }
  if (row.image_url !== DIR + was) { console.log(`  skip   ${key}: holds ${row.image_url} (changed since 2026-11-20)`); continue; }
  todo.push({ row, file, alt });
  console.log(`  change ${key}: ${was} -> ${file}`);
}
console.log(`${todo.length} of ${keys.length} rows to change`);

if (APPLY && todo.length) {
  if (!backupAt) { console.error("--apply needs --backup <file>"); process.exit(1); }
  fs.writeFileSync(backupAt, JSON.stringify({ at: new Date().toISOString(), rows: todo.map((t) => t.row) }, null, 1));
  await sql.begin(async (tx) => {
    for (const t of todo) {
      await tx`UPDATE media_assets SET image_url = ${DIR + t.file}, alt_text = ${t.alt}, attribution = NULL, license = NULL,
        source_url = NULL, subject = NULL, updated_at = now() WHERE id = ${t.row.id} AND image_url = ${t.row.image_url}`;
    }
  });
  console.log(`applied; backup at ${backupAt}`);
} else if (!APPLY) {
  console.log("dry run — add --apply --backup <file>");
}
await sql.end();
