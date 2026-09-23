/**
 * Bring the over-long titles and descriptions back under the limits.
 *
 * Found by `scripts/audit_site.mjs` against the live site: four titles past
 * ~60 characters and five descriptions past ~165, which is where Google stops
 * showing them. A truncated title loses the phrase it was written to rank for,
 * and a truncated description ends mid-sentence in the result.
 *
 * Only the rows listed here are touched, and only when they still hold the
 * exact text the audit measured — so an edit someone has made in the admin
 * since is never overwritten. Re-running after that is a no-op.
 *
 * Run: node scripts/trim_page_seo.mjs
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

/** route -> { field: [expectedCurrent, replacement] } */
const EDITS = [
  {
    route: "/md-ms-india",
    title: [
      "MD/MS Admission in India 2026 | NEET PG Counselling & College Predictor | Admission Hands",
      "NEET PG Counselling & MD/MS Admission 2026 | AdmissionHands",
    ],
  },
  {
    route: "/neet-college-predictor",
    title: [
      "NEET College Predictor 2026 — MBBS, BDS & MD/MS Seats by Rank | AdmissionHands",
      "NEET College Predictor 2026 — MBBS, BDS & MD/MS by Rank",
    ],
    description: [
      "Enter your NEET rank and see the colleges it reaches — MBBS, BDS and MD/MS. Every seat placed against the round it actually closed in, from the counselling authorities' own published results.",
      "Enter your NEET rank and see the colleges it reaches — MBBS, BDS and MD/MS, each placed against the round it actually closed in.",
    ],
  },
];

async function main() {
  let changed = 0;

  for (const edit of EDITS) {
    const [row] = await sql`SELECT title, description FROM page_seo WHERE route = ${edit.route}`;
    if (!row) {
      console.log(`  ${edit.route}: no row`);
      continue;
    }

    for (const field of ["title", "description"]) {
      const pair = edit[field];
      if (!pair) continue;
      const [expected, replacement] = pair;

      if (row[field] === replacement) {
        console.log(`  ${edit.route}.${field}: already trimmed`);
        continue;
      }
      if (row[field] !== expected) {
        console.log(`  ${edit.route}.${field}: edited since the audit — left alone`);
        continue;
      }

      if (field === "title") {
        await sql`UPDATE page_seo SET title = ${replacement}, updated_at = now() WHERE route = ${edit.route}`;
      } else {
        await sql`UPDATE page_seo SET description = ${replacement}, updated_at = now() WHERE route = ${edit.route}`;
      }
      console.log(`  ${edit.route}.${field}: ${row[field].length} -> ${replacement.length} chars`);
      changed += 1;
    }
  }

  // Anything still over the line, reported rather than guessed at — a marketing
  // description is the team's words, and shortening one is an editorial call.
  const long = await sql`
    SELECT route, length(title) AS t, length(description) AS d
      FROM page_seo
     WHERE length(title) > 65 OR length(description) > 165
     ORDER BY route
  `;
  if (long.length) {
    console.log("\nStill over the limit (yours to reword):");
    for (const r of long) {
      const bits = [];
      if (r.t > 65) bits.push(`title ${r.t}`);
      if (r.d > 165) bits.push(`description ${r.d}`);
      console.log(`  ${r.route}: ${bits.join(", ")}`);
    }
  }

  console.log(changed ? `\n${changed} change(s).` : "\nNothing to change.");
  await sql.end();
}

main().catch(async (error) => {
  console.error(error);
  await sql.end();
  process.exit(1);
});
