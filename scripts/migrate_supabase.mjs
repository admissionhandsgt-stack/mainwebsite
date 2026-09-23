/**
 * Copy every CMS table out of Supabase into PostgreSQL.
 *
 *   node scripts/migrate_supabase.mjs            # migrate
 *   node scripts/migrate_supabase.mjs --dry-run  # counts only
 *
 * Idempotent: each target table is truncated and refilled, so re-running after
 * a content edit in Supabase converges rather than duplicating.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_KEY and DATABASE_URL from
 * .env.local. The service key is needed because several tables deny anonymous
 * reads under RLS.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import postgres from "postgres";

const DRY_RUN = process.argv.includes("--dry-run");

/* ------------------------------- env -------------------------------- */

function env() {
  const out = {};
  const p = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return { ...out, ...process.env };
}

const E = env();
const SB_URL = E.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = E.SUPABASE_SERVICE_KEY || E.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const PG_URL = E.DATABASE_URL;

if (!SB_URL || !SB_KEY) {
  console.error("Supabase credentials missing from .env.local");
  process.exit(1);
}
if (!PG_URL && !DRY_RUN) {
  console.error("DATABASE_URL missing from .env.local");
  process.exit(1);
}

/* ----------------------------- helpers ------------------------------ */

async function fetchAll(table) {
  const out = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const res = await fetch(
      `${SB_URL}/rest/v1/${table}?select=*&order=id.asc&offset=${from}&limit=${pageSize}`,
      { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } },
    );
    if (!res.ok) {
      const body = await res.text();
      if (body.includes("PGRST205")) return null; // table does not exist
      throw new Error(`${table}: HTTP ${res.status} ${body.slice(0, 120)}`);
    }
    const batch = await res.json();
    out.push(...batch);
    if (batch.length < pageSize) break;
  }
  return out;
}

const bool = (v, d = false) => (v === null || v === undefined ? d : Boolean(v));
const int = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : null;
};
const ts = (v) => (v ? new Date(v) : null);
const str = (v) => (v === null || v === undefined ? null : String(v));

/** The four curated lists share a shape. */
const collegeRow = (r) => ({
  slug: str(r.slug),
  college_name: str(r.college_name),
  college_type: str(r.college_type),
  state: str(r.state),
  city: str(r.city),
  university_name: str(r.university_name),
  established_year: int(r.established_year),
  intake: int(r.intake),
  nri_seats: int(r.nri_seats),
  minority_seats: int(r.minority_seats),
  has_nri_seats: bool(r.has_nri_seats),
  has_minority_seats: bool(r.has_minority_seats),
  is_women_only: bool(r.is_women_only),
  image_url: str(r.image_url),
  source_type: str(r.source_type),
  display_order: int(r.display_order) ?? 0,
  is_active: bool(r.is_active, true),
});

/**
 * Each entry maps a Supabase table to a Postgres table and a row transform.
 * `skipNullSlug` drops rows the target's unique index would reject.
 */
const TABLES = [
  { from: "ug_all_colleges", to: "ug_all_colleges", map: collegeRow, requireSlug: true },
  { from: "ug_recommended_colleges", to: "ug_recommended_colleges", map: collegeRow, requireSlug: true },
  { from: "deemed_colleges", to: "deemed_colleges", map: collegeRow, requireSlug: true },
  {
    from: "pg_colleges",
    to: "pg_colleges_content",
    map: (r) => ({
      college_name: str(r.college_name),
      city: str(r.city),
      state: str(r.state),
      college_type: str(r.college_type),
      ownership: str(r.ownership),
      year_established: int(r.year_established),
      total_pg_seats: int(r.total_pg_seats),
      key_specialties: r.key_specialties ? JSON.stringify(r.key_specialties) : null,
      short_description: str(r.short_description),
      image_url: str(r.image_url),
      display_order: int(r.display_order) ?? 0,
      is_active: bool(r.is_active, true),
    }),
  },
  {
    from: "recommended_colleges",
    to: "recommended_colleges",
    map: (r) => ({
      name: str(r.name),
      location: str(r.location),
      fees: str(r.fees),
      seats: int(r.seats),
      image: str(r.image),
      domain: r.domain === "pg" ? "pg" : "ug",
      display_order: int(r.display_order) ?? 0,
    }),
  },
  {
    from: "pg_branches",
    to: "pg_branches",
    map: (r) => ({
      branch_name: str(r.branch_name),
      short_description: str(r.short_description),
      icon_url: str(r.icon_url),
      category: str(r.category),
      display_order: int(r.display_order) ?? 0,
      is_active: bool(r.is_active, true),
    }),
  },
  {
    from: "mbbs_states",
    to: "mbbs_states",
    map: (r) => ({
      name: str(r.name),
      slug: str(r.slug),
      image_url: str(r.image_url),
      colleges_count: int(r.colleges_count),
      content: str(r.content),
      is_active: bool(r.is_active, true),
    }),
    requireSlug: true,
  },
  {
    from: "videos",
    to: "videos",
    map: (r) => ({
      title: str(r.title),
      videos_id: str(r.videos_id),
      description: str(r.description),
      featured: bool(r.featured),
    }),
  },
  {
    from: "live_alerts",
    to: "live_alerts",
    map: (r) => ({
      title: str(r.title),
      link: str(r.link),
      image_url: str(r.image_url),
      is_active: bool(r.is_active, true),
      order_index: int(r.order_index) ?? 0,
    }),
  },
  {
    from: "legal_documents",
    to: "legal_documents",
    map: (r) => ({
      slug: str(r.slug),
      title: str(r.title),
      content: str(r.content) ?? "",
      last_updated: ts(r.last_updated),
      is_published: bool(r.is_published, true),
    }),
    requireSlug: true,
  },
  {
    from: "media_assets",
    to: "media_assets",
    map: (r) => ({
      media_key: str(r.media_key),
      title: str(r.title),
      image_url: str(r.image_url) ?? "",
      mobile_image_url: str(r.mobile_image_url),
      alt_text: str(r.alt_text),
      section_type: str(r.section_type),
      display_order: int(r.display_order) ?? 0,
      is_active: bool(r.is_active, true),
    }),
  },
  {
    from: "contact_info",
    to: "contact_info",
    map: (r) => ({
      phone_number: str(r.phone_number),
      whatsapp_number: str(r.whatsapp_number),
      email: str(r.email),
      lead_notification_phone: str(r.lead_notification_phone),
    }),
  },
  {
    // The PG leads become rows in the unified table, tagged with their level.
    from: "pg_leads",
    to: "leads",
    map: (r) => ({
      level: "pg",
      name: str(r.name),
      phone: str(r.phone) ?? "unknown",
      rank: int(r.rank),
      preferred_branch: str(r.preferred_branch),
      preferred_state: str(r.preferred_state),
      quota_interest: str(r.quota_interest),
      internship_status: str(r.internship_status),
      source_page: str(r.source_page),
      lead_status: str(r.lead_status) ?? "new",
      created_at: ts(r.created_at) ?? new Date(),
    }),
  },
];

/* ------------------------------- run -------------------------------- */

console.log(`\nSupabase : ${SB_URL}`);
console.log(`Mode     : ${DRY_RUN ? "DRY RUN (nothing is written)" : "WRITE"}\n`);

const sql = DRY_RUN ? null : postgres(PG_URL, { max: 4, prepare: false, onnotice: () => {} });
const summary = [];

try {
  for (const spec of TABLES) {
    process.stdout.write(`  ${spec.from.padEnd(24)}`);
    const source = await fetchAll(spec.from);

    if (source === null) {
      console.log("does not exist in Supabase — skipped");
      summary.push({ table: spec.from, source: "-", written: "-", note: "missing" });
      continue;
    }

    let mapped = source.map(spec.map);
    let dropped = 0;
    if (spec.requireSlug) {
      const before = mapped.length;
      const seen = new Set();
      mapped = mapped.filter((r) => {
        if (!r.slug || seen.has(r.slug)) return false;
        seen.add(r.slug);
        return true;
      });
      dropped = before - mapped.length;
    }

    if (DRY_RUN) {
      console.log(`${String(source.length).padStart(6)} rows` + (dropped ? `  (${dropped} would drop: no/duplicate slug)` : ""));
      summary.push({ table: spec.from, source: source.length, written: mapped.length, note: dropped ? `${dropped} dropped` : "" });
      continue;
    }

    await sql`TRUNCATE TABLE ${sql(spec.to)} RESTART IDENTITY CASCADE`;
    if (mapped.length) {
      for (let i = 0; i < mapped.length; i += 500) {
        await sql`INSERT INTO ${sql(spec.to)} ${sql(mapped.slice(i, i + 500))}`;
      }
    }
    const [{ n }] = await sql`SELECT COUNT(*)::int AS n FROM ${sql(spec.to)}`;
    const ok = n === mapped.length;
    console.log(`${String(source.length).padStart(6)} → ${String(n).padStart(6)} in Postgres ${ok ? "✓" : "✗ MISMATCH"}${dropped ? `  (${dropped} dropped: no/duplicate slug)` : ""}`);
    summary.push({ table: `${spec.from} → ${spec.to}`, source: source.length, written: n, note: dropped ? `${dropped} dropped` : ok ? "" : "MISMATCH" });
  }

  console.log("\n--- summary ---");
  const bad = summary.filter((s) => s.note === "MISMATCH");
  const total = summary.reduce((a, s) => a + (Number(s.written) || 0), 0);
  console.log(`  ${summary.length} tables, ${total.toLocaleString("en-IN")} rows in Postgres`);
  if (bad.length) {
    console.log(`  ${bad.length} MISMATCHED — investigate before switching the app over:`);
    bad.forEach((b) => console.log(`    ${b.table}`));
    process.exitCode = 1;
  } else if (!DRY_RUN) {
    console.log("  every table matched its source count.");
  }
} finally {
  if (sql) await sql.end({ timeout: 5 });
}
