// Creates the admin rows that drive every page's hero (2026-10-18). Idempotent; never overwrites
// a value somebody edited in the admin.
//
//   1. site_settings: one row per field in src/lib/pageCopyDefaults.ts (`<key>.<field>`), grouped
//      per page in Admin → Content → Text & numbers, plus the Telegram channel settings.
//   2. media_assets: hero photographs per page, in Admin → Media. Only licensed photographs we
//      already hold, each of the place it names (a state page gets a college in that state), or
//      generic scenes (an exam hall, residents) that claim no place.
//
//   node --env-file=.env.local scripts/seed_page_copy.mjs [--dry-run]
import postgres from "postgres";
import { PAGE_COPY, SOCIAL_SETTINGS, TELEGRAM_SETTINGS, VERIFY_SETTINGS } from "../src/lib/pageCopyDefaults.ts";

const dry = process.argv.includes("--dry-run");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });

// Hero photographs: page key -> the existing media row whose picture and credit it reuses.
const HERO_PHOTOS = [
  // A college in the state itself — the subject is credited on the photo.
  ["page.pg_state.maharashtra.hero", "college_campus_1"], // Government Medical College, Nagpur
  ["page.ug_state.maharashtra.hero", "college_campus_1"],
  ["page.pg_state.gujarat.hero", "college_campus_2"], // GCS Medical College, Ahmedabad
  ["page.ug_state.gujarat.hero", "college_campus_2"],
  ["page.pg_state.west-bengal.hero", "college_campus_3"], // Murshidabad Medical College
  ["page.ug_state.west-bengal.hero", "college_campus_3"],
  ["page.pg_state.kerala.hero", "about_hero"], // Government Medical College, Kozhikode
  ["page.ug_state.kerala.hero", "mbbs_hero_campus"], // Government Medical College, Thiruvananthapuram
  ["page.pg_state.telangana.hero", "knowus_hero"], // Osmania Medical College, Hyderabad
  ["page.ug_state.telangana.hero", "knowus_hero"],
  ["page.pg_state.madhya-pradesh.hero", "homepage_hero_campus"], // AIIMS Bhopal
  ["page.ug_state.madhya-pradesh.hero", "homepage_hero_campus"],
  ["page.pg_state.tamil-nadu.hero", "nri_hero"], // Christian Medical College, Vellore
  ["page.ug_state.tamil-nadu.hero", "nri_hero"],
  ["page.pg_state.haryana.hero", "pg_hero_bg"], // ESIC Medical College, Faridabad
  ["page.ug_state.haryana.hero", "pg_hero_bg"],
  ["page.pg_state.assam.hero", "neet_medical_college"], // Gauhati Medical College
  ["page.ug_state.assam.hero", "neet_medical_college"],
  // Generic scenes that name no place.
  ["page.neet_pg_cutoff.hero", "neet_exam"], // an exam hall
  ["page.neet_ug_cutoff.hero", "neet_exam"],
  ["page.pg_stipend.hero", "pg_hero_doctors"], // two residents
  // The light heroes (2026-10-21): every data page gets a relevant scene — a lab, a ward, an OT, a
  // counselling session, doctors at work. Generic pictures that name no college. An admin's own choice
  // is never replaced (ON CONFLICT DO NOTHING); change any of them in Admin → Media.
  ["page.stipend_report.hero", "pg_hero_doctors"],
  ["page.deemed_pg.hero", "services_carousel_2"], // doctors in a library
  ["page.nri_colleges.hero", "services_carousel_2"],
  ["page.private_pg_fees.hero", "services_carousel_1"], // a family with a counsellor
  ["page.quota_management.hero", "services_carousel_1"],
  ["page.quota_nri.hero", "services_carousel_1"],
  ["page.nri_documents.hero", "services_carousel_1"],
  ["page.pg_counselling.hero", "services_carousel_1"],
  ["page.pg_round.hero", "services_carousel_1"],
  ["page.pg_colleges.hero", "services_carousel_2"], // doctors — the old campus photo was mostly sky
  ["page.ug_state.hero", "mbbs_doctors_stats"], // doctors on a hospital floor
  // Specialty scenes, from the branch photographs in public/assets/images/uploads.
  ["page.pg_seat_matrix.hero", { url: "/assets/images/uploads/branches-pathology.avif", alt: "A pathologist at the microscope in a hospital lab" }],
  ["page.pg_states.hero", { url: "/assets/images/uploads/branches-general-medicine.avif", alt: "A resident doctor on a hospital ward" }],
  ["page.pg_state.hero", { url: "/assets/images/uploads/branches-general-medicine.avif", alt: "A resident doctor on a hospital ward" }],
  ["page.pg_bond.hero", { url: "/assets/images/uploads/branches-general-medicine.avif", alt: "A resident doctor on a hospital ward" }],
  ["page.pg_branches.hero", { url: "/assets/images/uploads/branches-pulmonary-medicine.avif", alt: "A specialist reading a chest X-ray" }],
  ["page.open_data.hero", { url: "/assets/images/uploads/branches-radio-diagnosis.avif", alt: "A radiologist reading scans" }],
  ["page.neet_ss.hero", { url: "/assets/images/uploads/branches-general-surgery.avif", alt: "Surgeons in an operating theatre" }],
  ["page.neet_ss_course.hero", { url: "/assets/images/uploads/branches-general-surgery.avif", alt: "Surgeons in an operating theatre" }],
];

let settings = 0;
let upgraded = 0;
let i = 0;
for (const [key, g] of Object.entries(PAGE_COPY)) {
  for (const [field, f] of Object.entries(g.fields)) {
    const k = `${key}.${field}`;
    i++;
    if (dry) {
      console.log("setting", k, "=", f.value.slice(0, 60));
      continue;
    }
    const r = await sql`
      INSERT INTO site_settings (key, value, value_type, group_name, label, display_order)
      VALUES (${k}, ${f.value}, ${f.long ? "longtext" : "text"}, ${g.group}, ${f.label}, ${i})
      ON CONFLICT (key) DO UPDATE
        SET label = EXCLUDED.label, group_name = EXCLUDED.group_name,
            value_type = EXCLUDED.value_type, display_order = EXCLUDED.display_order
      RETURNING (xmax = 0) AS inserted`;
    if (r[0]?.inserted) settings++;
    // A corrected default reaches a row only while that row still holds an earlier default
    // word for word — an admin's edit is never touched.
    if (f.was?.length) {
      const u = await sql`
        UPDATE site_settings SET value = ${f.value}, updated_at = now()
         WHERE key = ${k} AND value = ANY(${f.was}) AND value <> ${f.value}
        RETURNING key`;
      if (u.length) {
        upgraded++;
        console.log("upgraded", k);
      }
    }
  }
}
for (const t of TELEGRAM_SETTINGS) {
  i++;
  if (dry) {
    console.log("setting", t.key, "=", t.value.slice(0, 60));
    continue;
  }
  const r = await sql`
    INSERT INTO site_settings (key, value, value_type, group_name, label, display_order)
    VALUES (${t.key}, ${t.value}, ${t.key === "social.telegram" ? "url" : t.long ? "longtext" : "text"}, ${"Telegram channel"}, ${t.label}, ${i})
    ON CONFLICT (key) DO UPDATE
      SET label = EXCLUDED.label, group_name = EXCLUDED.group_name, display_order = EXCLUDED.display_order
    RETURNING (xmax = 0) AS inserted`;
  if (r[0]?.inserted) settings++;
}
// Written once; the label and group follow the code, the value stays the admin's.
for (const t of SOCIAL_SETTINGS) {
  i++;
  if (dry) {
    console.log("setting", t.key, "=", t.value.slice(0, 60));
    continue;
  }
  const r = await sql`
    INSERT INTO site_settings (key, value, value_type, group_name, label, display_order)
    VALUES (${t.key}, ${t.value}, ${"url"}, ${"Social links"}, ${t.label}, ${i})
    ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, group_name = EXCLUDED.group_name
    RETURNING (xmax = 0) AS inserted`;
  if (r[0]?.inserted) settings++;
}

// Search-engine verification codes: created empty, filled by an admin (public by design — meta tags).
for (const t of VERIFY_SETTINGS) {
  i++;
  if (dry) {
    console.log("setting", t.key, "(empty)");
    continue;
  }
  const r = await sql`
    INSERT INTO site_settings (key, value, value_type, group_name, label, display_order)
    VALUES (${t.key}, ${""}, ${"text"}, ${"Site verification"}, ${t.label}, ${i})
    ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, group_name = EXCLUDED.group_name
    RETURNING (xmax = 0) AS inserted`;
  if (r[0]?.inserted) settings++;
}

let media = 0;
for (const [key, from] of HERO_PHOTOS) {
  // A media row to copy (picture and credit), or a file we hold with its own alt text.
  const [src] =
    typeof from === "string"
      ? await sql`SELECT image_url, alt_text, attribution, license, source_url, subject FROM media_assets WHERE media_key = ${from}`
      : [{ image_url: from.url, alt_text: from.alt, attribution: null, license: null, source_url: null, subject: null }];
  if (!src) {
    console.log("no source media row", from);
    continue;
  }
  if (dry) {
    console.log("media", key, "<-", typeof from === "string" ? from : from.url, src.subject ?? "");
    continue;
  }
  const r = await sql`
    INSERT INTO media_assets (media_key, title, image_url, alt_text, section_type, display_order, is_active, attribution, license, source_url, subject)
    VALUES (${key}, ${`Hero: ${key.replace(/^page\./, "").replace(/\.hero$/, "")}`}, ${src.image_url}, ${src.alt_text}, ${"hero"}, ${100}, ${true},
            ${src.attribution}, ${src.license}, ${src.source_url}, ${src.subject})
    ON CONFLICT (media_key) DO NOTHING
    RETURNING id`;
  if (r.length) media++;
}

console.log(dry ? "dry run — nothing written" : `settings created: ${settings}, upgraded: ${upgraded}, media rows created: ${media}`);
await sql.end();
