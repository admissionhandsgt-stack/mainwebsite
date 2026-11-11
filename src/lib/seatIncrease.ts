/**
 * "NEET PG seat increase 2026", "new pg seats 2026", "nmc approved pg seats" (2026-11-12, the journey study): what MCC added
 * to its seat matrix after it was first published (its "newly added seats" notices, lib/mccAddedSeats.ts — only the latest
 * revision of a round counts), by matrix, branch, state and college, beside NMC's register of approved PG seats. Seats here
 * are MCC's and NMC's own counts. Server only.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export interface SeatIncrease {
  year: number;
  base: number;
  added: number;
  total: number;
  byMatrix: { matrix: string; base: number; added: number }[];
  byBranch: { branch: string; slug: string | null; added: number; colleges: number }[];
  byState: { state: string; added: number; colleges: number }[];
  byCollege: { name: string; slug: string | null; state: string | null; added: number; branches: number }[];
  notices: { title: string; url: string; on: string }[];
  /** NMC's register of approved seats, by course type, and the date it was last updated. */
  nmc: { type: string; seats: number; colleges: number }[];
  nmcUpdated: string | null;
}

const ADDED = sql`source_title ILIKE '%newly added%'`;

export const getSeatIncrease = unstable_cache(
  async (): Promise<SeatIncrease | null> => {
    try {
      const yr = ((await db.execute(sql`SELECT MAX(year)::int AS y FROM mcc_seat_matrix`)) as unknown as { y: number | null }[])[0]?.y;
      if (!yr) return null;
      const [matrix, branch, state, college, notices, nmc] = await Promise.all([
        db.execute(sql`
          SELECT seat_matrix AS matrix,
                 COALESCE(SUM(total_seats) FILTER (WHERE NOT (${ADDED})), 0)::int AS base,
                 COALESCE(SUM(total_seats) FILTER (WHERE ${ADDED}), 0)::int AS added
            FROM mcc_seat_matrix WHERE year = ${yr} GROUP BY seat_matrix ORDER BY 2 DESC`),
        db.execute(sql`
          SELECT COALESCE(c.name, regexp_replace(m.mcc_course, '\\s*\\([A-Z][A-Z-]{1,8}\\)$', '')) AS branch,
                 MAX(c.slug) AS slug, SUM(m.total_seats)::int AS added, COUNT(DISTINCT COALESCE(m.institute_id::text, m.mcc_institute_code))::int AS colleges
            FROM mcc_seat_matrix m LEFT JOIN courses c ON c.id = m.course_id
           WHERE m.year = ${yr} AND ${ADDED}
           GROUP BY 1 ORDER BY 3 DESC`),
        db.execute(sql`
          SELECT m.state, SUM(m.total_seats)::int AS added, COUNT(DISTINCT COALESCE(m.institute_id::text, m.mcc_institute_code))::int AS colleges
            FROM mcc_seat_matrix m WHERE m.year = ${yr} AND ${ADDED} AND m.state IS NOT NULL
           GROUP BY 1 ORDER BY 2 DESC`),
        db.execute(sql`
          SELECT COALESCE(i.name, MAX(m.mcc_college_name)) AS name, i.slug, MAX(m.state) AS state,
                 SUM(m.total_seats)::int AS added, COUNT(DISTINCT m.mcc_course)::int AS branches
            FROM mcc_seat_matrix m LEFT JOIN institutes i ON i.id = m.institute_id
           WHERE m.year = ${yr} AND ${ADDED}
           GROUP BY i.id, i.name, i.slug, CASE WHEN i.id IS NULL THEN m.mcc_institute_code END
           ORDER BY 4 DESC LIMIT 25`),
        db.execute(sql`
          SELECT DISTINCT ON (m.source_title) m.source_title AS title, m.source_file AS url, (f.detected_at AT TIME ZONE 'Asia/Kolkata')::date::text AS on
            FROM mcc_seat_matrix m LEFT JOIN mcc_added_seat_files f ON f.url = m.source_file
           WHERE m.year = ${yr} AND ${ADDED} ORDER BY m.source_title`),
        db.execute(sql`
          SELECT course_type AS type, SUM(approved_seat)::int AS seats, COUNT(DISTINCT college_code)::int AS colleges, MAX(nmc_updated)::text AS updated
            FROM nmc_courses WHERE course_type IN ('MD', 'MS', 'Diploma', 'DM', 'M.Ch.')
           GROUP BY 1 ORDER BY 2 DESC`),
      ]);
      const m = matrix as unknown as { matrix: string; base: number; added: number }[];
      const base = m.reduce((a, r) => a + r.base, 0);
      const added = m.reduce((a, r) => a + r.added, 0);
      const nm = nmc as unknown as { type: string; seats: number; colleges: number; updated: string | null }[];
      return {
        year: yr,
        base,
        added,
        total: base + added,
        byMatrix: m,
        byBranch: branch as unknown as SeatIncrease["byBranch"],
        byState: state as unknown as SeatIncrease["byState"],
        byCollege: college as unknown as SeatIncrease["byCollege"],
        notices: (notices as unknown as { title: string; url: string; on: string }[]).map((x) => ({
          ...x,
          title: x.title.replace(/^MCC PG Medical \d{4} - /, ""),
        })),
        nmc: nm.map(({ type, seats, colleges }) => ({ type, seats, colleges })),
        nmcUpdated: nm.reduce<string | null>((a, r) => (r.updated && (!a || r.updated > a) ? r.updated : a), null),
      };
    } catch {
      return null;
    }
  },
  ["seat-increase-v1"],
  { revalidate: 3600, tags: ["mcc", "nmc"] },
);
