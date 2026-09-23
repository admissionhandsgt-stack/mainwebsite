/**
 * Checks the UG import for cutoffs attributed to the wrong college.
 *
 * The source publishes a detail page per college and we parse each page's own
 * cutoff table, so a row lands wherever the source put it. On 2026-09-22 four
 * pages turned out to carry MBBS cutoffs under a dental or homoeopathy
 * college's name — verified by reading the saved HTML, so the error is the
 * source's and the import reproduces it faithfully.
 *
 * Two symptoms, both worth catching after every re-import:
 *
 *   1. A college whose own name says dental / ayurveda / homoeopathy carries
 *      MBBS rows. The rows are usually real seats filed under the wrong
 *      sibling institution — deleting them loses real data, so they are
 *      reported rather than touched.
 *
 *   2. The sibling is missing entirely. "MES Dental College, Malappuram" holds
 *      27 MBBS rows and MES Medical College, Perinthalmanna — a 150-seat MBBS
 *      college in the same district, run by the same trust — is not in the
 *      import at all.
 *
 * `getUgColleges()` keeps case 1 out of the MBBS directory by name. This
 * script is how you find out whether the next import brought more.
 *
 * Run: node scripts/audit_ug_attribution.mjs
 */

import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = postgres(process.env.DATABASE_URL, { prepare: false });

/**
 * Streams that are not MBBS.
 *
 * "siddha" is deliberately absent: it would match Siddhartha Medical College
 * and Sri Siddhartha Medical College, which are genuine MBBS colleges, and the
 * Siddha-stream colleges it would legitimately catch carry no MBBS rows
 * anyway, so they never reach an MBBS surface.
 */
const OTHER_STREAMS = "(dental|ayurved|homoeopath|homeopath|nursing|physiothe|veterinar)";

async function main() {
  const suspect = await sql`
    SELECT i.name, i.slug, x.n::int AS mbbs_rows
    FROM institutes i
    JOIN (
      SELECT cr.institute_id, COUNT(*) AS n
      FROM closing_ranks cr
      JOIN courses c ON c.id = cr.course_id
      WHERE cr.level = 'ug' AND c.name ILIKE 'MBBS'
      GROUP BY cr.institute_id
    ) x ON x.institute_id = i.id
    WHERE i.level = 'ug' AND i.name ~* ${OTHER_STREAMS}
    ORDER BY x.n DESC
  `;

  console.log("MBBS cutoffs filed under a non-MBBS college name\n");
  if (suspect.length === 0) {
    console.log("  none — every MBBS row sits on a college whose name agrees.");
  } else {
    for (const r of suspect) {
      console.log(`  MBBS x${String(r.mbbs_rows).padEnd(4)} ${r.name}`);
    }
    const total = suspect.reduce((a, r) => a + r.mbbs_rows, 0);
    console.log(`\n  ${suspect.length} college(s), ${total} rank row(s).`);
    console.log("  These are hidden from the MBBS directory but still reachable");
    console.log("  through the seat predictor, because the seats behind them are");
    console.log("  probably real and belong to a sibling college. Check the source");
    console.log("  page before deleting anything.");
  }

  // The counterpart symptom: does the properly-named sibling exist at all?
  const orphanCheck = await sql`
    SELECT i.name
    FROM institutes i
    WHERE i.level = 'ug' AND i.name ~* ${OTHER_STREAMS}
      AND EXISTS (
        SELECT 1 FROM closing_ranks cr
        JOIN courses c ON c.id = cr.course_id
        WHERE cr.institute_id = i.id AND cr.level = 'ug' AND c.name ILIKE 'MBBS'
      )
      -- No institute sharing the first two words of the name that reads as a
      -- medical college. A crude proxy, but it is the pattern that found MES.
      AND NOT EXISTS (
        SELECT 1 FROM institutes sib
        WHERE sib.level = 'ug' AND sib.id <> i.id
          AND sib.name ILIKE split_part(i.name, ' ', 1) || '%'
          AND sib.name ~* 'medical'
          AND sib.name !~* ${OTHER_STREAMS}
      )
    ORDER BY i.name
  `;

  console.log("\n\nNo medical-college sibling found for\n");
  if (orphanCheck.length === 0) {
    console.log("  none — each one has a plausibly-named sibling in the data.");
  } else {
    for (const r of orphanCheck) console.log(`  ${r.name}`);
    console.log("\n  The real college may be missing from the import entirely.");
  }

  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
