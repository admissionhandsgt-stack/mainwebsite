/**
 * Bring every image still hosted on Supabase Storage into the repo, and
 * repoint the database at the local copy.
 *
 *   node scripts/pull_supabase_storage.mjs --dry-run
 *   node scripts/pull_supabase_storage.mjs
 *
 * Without this, deleting the Supabase project silently breaks every image the
 * admin has ever uploaded — the rows survive the migration, but the files they
 * point at do not.
 *
 * Downloads to public/assets/images/uploads/ and rewrites the URL columns to
 * /assets/images/uploads/<name>, which Next serves as a static asset.
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import postgres from "postgres";

const DRY_RUN = process.argv.includes("--dry-run");

const OUT_DIR = path.join(process.cwd(), "public", "assets", "images", "uploads");
const PUBLIC_PREFIX = "/assets/images/uploads";

/** Columns that can hold a Supabase Storage URL. */
const TARGETS = [
  { table: "media_assets", columns: ["image_url", "mobile_image_url"] },
  { table: "ug_all_colleges", columns: ["image_url"] },
  { table: "ug_recommended_colleges", columns: ["image_url"] },
  { table: "deemed_colleges", columns: ["image_url"] },
  { table: "pg_colleges_content", columns: ["image_url"] },
  { table: "mbbs_states", columns: ["image_url"] },
  { table: "live_alerts", columns: ["image_url"] },
  { table: "pg_branches", columns: ["icon_url"] },
  { table: "recommended_colleges", columns: ["image"] },
];

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
if (!E.DATABASE_URL) {
  console.error("DATABASE_URL missing from .env.local");
  process.exit(1);
}

/** A stable, filesystem-safe name derived from the original storage path. */
function localNameFor(url) {
  const decoded = decodeURIComponent(url.split("?")[0]);
  const after = decoded.split("/object/public/")[1] ?? decoded;
  const base = after
    .replace(/^media-assets\//, "")
    .replace(/[^a-zA-Z0-9._/-]/g, "-")
    .replace(/\//g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
  return base || `asset-${Date.now()}.bin`;
}

const sql = postgres(E.DATABASE_URL, { max: 4, prepare: false, onnotice: () => {} });

try {
  console.log(`\nMode : ${DRY_RUN ? "DRY RUN (nothing downloaded or written)" : "DOWNLOAD + REWRITE"}\n`);

  // 1. Collect every distinct Supabase URL still referenced.
  const found = new Map(); // url -> [{table, column}]
  for (const { table, columns } of TARGETS) {
    for (const column of columns) {
      const rows = await sql.unsafe(
        `SELECT DISTINCT ${column} AS url FROM ${table} WHERE ${column} LIKE '%supabase.co%'`,
      );
      for (const r of rows) {
        if (!r.url) continue;
        if (!found.has(r.url)) found.set(r.url, []);
        found.get(r.url).push({ table, column });
      }
    }
  }

  console.log(`Distinct Supabase Storage URLs referenced: ${found.size}`);
  if (found.size === 0) {
    console.log("Nothing to do — no image points at Supabase any more.\n");
    process.exit(0);
  }

  if (DRY_RUN) {
    for (const [url, uses] of found) {
      const places = uses.map((u) => `${u.table}.${u.column}`).join(", ");
      console.log(`  ${localNameFor(url).padEnd(46)} ← ${places}`);
    }
    console.log(`\nWould download ${found.size} files into ${PUBLIC_PREFIX}/\n`);
    process.exit(0);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  // 2. Download each one, then repoint every column that referenced it.
  let ok = 0;
  let failed = 0;
  for (const [url, uses] of found) {
    const name = localNameFor(url);
    const dest = path.join(OUT_DIR, name);
    const localUrl = `${PUBLIC_PREFIX}/${name}`;

    try {
      if (!fs.existsSync(dest)) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length === 0) throw new Error("empty file");
        fs.writeFileSync(dest, buf);
      }

      for (const { table, column } of uses) {
        await sql.unsafe(`UPDATE ${table} SET ${column} = $1 WHERE ${column} = $2`, [localUrl, url]);
      }
      const kb = (fs.statSync(dest).size / 1024).toFixed(0);
      console.log(`  ✓ ${name.padEnd(46)} ${kb.padStart(5)} KB`);
      ok++;
    } catch (error) {
      // Leave the row pointing at Supabase: a broken local path would be worse
      // than a URL that at least still works until the project is deleted.
      console.log(`  ✗ ${name.padEnd(46)} ${error instanceof Error ? error.message : error}`);
      failed++;
    }
  }

  // 3. Prove nothing still points at Supabase.
  let remaining = 0;
  for (const { table, columns } of TARGETS) {
    for (const column of columns) {
      const [{ n }] = await sql.unsafe(
        `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${column} LIKE '%supabase.co%'`,
      );
      remaining += n;
    }
  }

  console.log(`\n  downloaded ${ok}, failed ${failed}`);
  console.log(`  rows still pointing at Supabase Storage: ${remaining}`);
  console.log(
    remaining === 0
      ? "\n  Storage is fully local. The Supabase project can be deleted.\n"
      : "\n  Some rows still reference Supabase — do NOT delete the project yet.\n",
  );
  if (remaining > 0 || failed > 0) process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
