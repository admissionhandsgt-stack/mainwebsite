/**
 * Facts about how counselling actually moves, counted from our own data —
 * the case for a counsellor, made with numbers that cannot drift from the
 * database (the rule in CLAUDE.md, "Numbers on the site come from the database").
 *
 * Server only. Cached for a day; it only changes when an import runs.
 */

import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { logError } from "@/lib/logger";

export interface CounsellingFacts {
  /** Share of seats (0–100) whose cut went to a later rank after round 1. */
  movedAfterR1: { pg: number; ug: number };
  /** Share whose cut went at least half as far again after round 1. */
  farBeyondR1: { pg: number; ug: number };
  counsellings: { pg: number; ug: number };
  categoryCodes: number;
  quotaTypes: number;
  /** Of the PG seats in the latest complete year, how many closed tighter in their last round than an earlier one. */
  lastRoundTighter: { seats: number; of: number; year: number | null };
  /** PG colleges where one seat's published fee is at least five times another's. */
  feeFiveX: number;
}

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export const getCounsellingFacts = unstable_cache(
  async (): Promise<CounsellingFacts | null> => {
    try {
      const [seats, counsellings, codes, last, fee] = await Promise.all([
        db.execute(sql`
          SELECT level::text AS level,
                 COUNT(*) FILTER (WHERE widest_latest > r1_latest)::int        AS moved,
                 COUNT(*) FILTER (WHERE widest_latest > r1_latest * 1.5)::int  AS far,
                 COUNT(*) FILTER (WHERE r1_latest IS NOT NULL AND widest_latest IS NOT NULL)::int AS base
            FROM seat_options GROUP BY level
        `),
        db.execute(sql`SELECT level::text AS level, COUNT(DISTINCT counselling_id)::int AS n FROM seat_options GROUP BY level`),
        db.execute(sql`
          SELECT COUNT(DISTINCT category_id)::int AS categories, COUNT(DISTINCT quota_id)::int AS quotas FROM seat_options
        `),
        db.execute(sql`
          WITH y AS (
            -- The latest PG year with a third round, so a year in progress does not count.
            SELECT MAX(year) AS year FROM closing_ranks WHERE level = 'pg' AND round_label = 'R3'
          ), r AS (
            SELECT cr.institute_id, cr.course_id, cr.quota_id, cr.category_id, cr.round_label, cr.closing_rank
              FROM closing_ranks cr, y WHERE cr.level = 'pg' AND cr.year = y.year AND cr.closing_rank > 0
          ), w AS (
            SELECT MAX(closing_rank) AS widest, (ARRAY_AGG(closing_rank ORDER BY round_label DESC))[1] AS last
              FROM r GROUP BY institute_id, course_id, quota_id, category_id
          )
          SELECT (SELECT year FROM y)::int AS year, COUNT(*)::int AS n,
                 COUNT(*) FILTER (WHERE last < widest)::int AS tighter
            FROM w
        `),
        db.execute(sql`
          SELECT COUNT(*) FILTER (WHERE mx >= 5 * mn)::int AS n FROM (
            SELECT institute_id, MAX(NULLIF(fee_inr, 0)) AS mx, MIN(NULLIF(fee_inr, 0)) AS mn
              FROM seat_options WHERE level = 'pg' GROUP BY institute_id
          ) t WHERE mn > 0
        `),
      ]);
      const by = <T extends { level: string }>(rows: T[], level: string) => rows.find((r) => r.level === level);
      const s = seats as unknown as { level: string; moved: number; far: number; base: number }[];
      const c = counsellings as unknown as { level: string; n: number }[];
      const k = (codes as unknown as { categories: number; quotas: number }[])[0];
      const l = (last as unknown as { year: number | null; n: number; tighter: number }[])[0];
      const f = (fee as unknown as { n: number }[])[0];
      const pg = by(s, "pg");
      const ug = by(s, "ug");
      return {
        movedAfterR1: { pg: pct(pg?.moved ?? 0, pg?.base ?? 0), ug: pct(ug?.moved ?? 0, ug?.base ?? 0) },
        farBeyondR1: { pg: pct(pg?.far ?? 0, pg?.base ?? 0), ug: pct(ug?.far ?? 0, ug?.base ?? 0) },
        counsellings: { pg: by(c, "pg")?.n ?? 0, ug: by(c, "ug")?.n ?? 0 },
        categoryCodes: k?.categories ?? 0,
        quotaTypes: k?.quotas ?? 0,
        lastRoundTighter: { seats: l?.tighter ?? 0, of: l?.n ?? 0, year: l?.year ?? null },
        feeFiveX: f?.n ?? 0,
      };
    } catch (error) {
      logError(error, { route: "counsellingFacts" });
      return null;
    }
  },
  ["counselling-facts-v1"],
  { revalidate: 86400, tags: ["seat-data"] },
);
