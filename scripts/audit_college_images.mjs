#!/usr/bin/env node
/**
 * Re-check every stored photograph against the current rules.
 *
 *   node scripts/audit_college_images.mjs            # report
 *   node scripts/audit_college_images.mjs --fix      # and clear what fails
 *
 * The matching rules in `fetch_college_images.mjs` got stricter twice while it
 * was already running, each time because a wrong match turned up in review:
 * a Malaysian college for "UCMS", and Christian Medical College Vellore for
 * "Dr. S.N. Medical College" — a name that reduces to "medical college" once
 * its initials drop out, and so matches almost anything.
 *
 * Rows written before a rule existed do not re-check themselves. This applies
 * today's rules to what is already stored, so the earlier, looser passes cannot
 * leave a wrong photograph behind.
 *
 * It checks the **recorded source article**, not the live search, so it is
 * deterministic and needs no network.
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });
const FIX = process.argv.includes("--fix");

/* --- the same rules fetch_college_images.mjs applies, kept in step --- */

const EXPAND = [
  [/\baiims\b/g, "all india institute of medical sciences"],
  [/\bjipmer\b/g, "jawaharlal institute of postgraduate medical education and research"],
  [/\bpgimer\b/g, "postgraduate institute of medical education and research"],
  [/\bkgmu\b/g, "king george medical university"],
  [/\bmamc\b/g, "maulana azad medical college"],
  [/\bucms\b/g, "university college of medical sciences"],
  [/\bvmmc\b/g, "vardhman mahavir medical college"],
  [/\blhmc\b/g, "lady hardinge medical college"],
  [/\bnimhans\b/g, "national institute of mental health and neurosciences"],
  [/\bjnmc\b/g, "jawaharlal nehru medical college"],
  [/\bgmc\b/g, "government medical college"],
];

function norm(s) {
  let t = String(s ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  for (const [re, full] of EXPAND) t = t.replace(re, full);
  return t.replace(/\s+/g, " ").trim();
}

const STOP = new Set(["the", "of", "and", "for", "a", "an", "dr", "shri", "sri", "smt", "late", "pt"]);
const tokens = (s) => norm(s).split(" ").filter((t) => t.length > 1 && !STOP.has(t));

const GENERIC = new Set([
  "medical", "college", "institute", "institution", "sciences", "science",
  "hospital", "research", "centre", "center", "university", "school",
  "government", "govt", "memorial", "medicine", "academy", "health",
]);

const MEDICAL = ["medical", "medicine", "dental", "ayurved", "homoeopath", "homeopath", "nursing"];

function titleMatches(collegeName, title) {
  const want = tokens(collegeName);
  const distinctive = want.filter((t) => !GENERIC.has(t));
  if (!distinctive.length) return { ok: false, why: "name has no distinctive word" };

  const have = norm(title);
  const missing = want.filter((t) => !have.includes(t));
  if (missing.length) return { ok: false, why: `title lacks: ${missing.join(", ")}` };

  const isMedical = MEDICAL.some((m) => norm(collegeName).includes(m));
  if (isMedical && !MEDICAL.some((m) => have.includes(m))) {
    return { ok: false, why: "medical college matched a non-medical article" };
  }
  return { ok: true };
}

/**
 * The source title, read back out of the URL it was stored with.
 *
 * Two shapes now: a Wikipedia article (`/wiki/Madras_Medical_College`) and,
 * since the Commons fallback, a file page (`/wiki/File:Diphu_Medical_College_
 * %26_Hospital_Gate.jpg`). The `File:` prefix and the extension are not part of
 * the name and must come off, or a tightened rule would read "jpg" as a word
 * the college is missing and clear a photograph that is perfectly good.
 */
const titleFromUrl = (url) =>
  decodeURIComponent(String(url ?? "").split("/wiki/").pop() ?? "")
    .replace(/_/g, " ")
    .replace(/^File:/i, "")
    .replace(/\.[a-z0-9]+$/i, "");

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

const TABLES = [
  ["pg_colleges_content", "college_name"],
  ["deemed_colleges", "college_name"],
  ["ug_all_colleges", "college_name"],
];

let checked = 0;
let bad = 0;

try {
  for (const [table, nameCol] of TABLES) {
    const rows = await sql.unsafe(
      `SELECT id, ${nameCol} AS name, image_source_url
         FROM ${table}
        WHERE image_source_url IS NOT NULL
        ORDER BY ${nameCol}`,
    );

    for (const row of rows) {
      checked++;
      const verdict = titleMatches(row.name, titleFromUrl(row.image_source_url));
      if (verdict.ok) continue;

      bad++;
      console.log(`  ${table}  ${row.name.slice(0, 44).padEnd(46)}${verdict.why}`);
      console.log(`      source: ${titleFromUrl(row.image_source_url)}`);

      if (FIX) {
        await sql.unsafe(
          `UPDATE ${table}
              SET image_url = NULL, image_attribution = NULL,
                  image_license = NULL, image_source_url = NULL
            WHERE id = $1`,
          [row.id],
        );
      }
    }
  }
} finally {
  await sql.end();
}

console.log(
  `\n${checked} photographs checked, ${bad} fail today's rules${FIX ? " and were cleared" : ""}.`,
);
if (bad && !FIX) console.log("Re-run with --fix to clear them.");
process.exit(bad && !FIX ? 1 : 0);
