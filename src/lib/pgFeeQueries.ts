/**
 * PG fees in private and deemed colleges — "MD fees in private colleges",
 * "deemed university PG fee structure", "NEET PG NRI quota fees".
 *
 * **Ranges are 10th–90th percentile, with the median, and say so.** The
 * extremes of the published fees include slips — a ₹1,000 private PG fee in
 * Gujarat, a ₹10,000 deemed management fee — and a plain minimum would put
 * them in a headline. The project rule is never to invent a plausibility floor
 * (CLAUDE.md, "A fee of 0 means not published"); a percentile range does not
 * invent anything, it reports where most seats sit, and one bad row cannot move
 * it. Only zero is dropped, as everywhere.
 *
 * Fees are grouped by **quota family** — state/government, management, NRI —
 * because a government-quota seat in a private college and a management seat in
 * the same college are different prices for different people.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

const rows = <T,>(r: unknown) => r as unknown as T[];
const int = (v: unknown) => (v == null ? null : Math.round(Number(v)));

/** The same conservative families as quotaQueries: a label counts only when it says so. NRI wins ties. */
const FAMILY = sql`CASE
  WHEN q.label ILIKE 'DNB%' OR q.label ILIKE 'NBE%' OR q.label ILIKE '%DNB%' THEN 'DNB / NBEMS diploma'
  WHEN q.label ILIKE '%NRI%' THEN 'NRI'
  WHEN q.label ILIKE '%manag%' OR q.label ILIKE '%mgmt%' OR q.label IN ('MNG', 'MM') OR q.label ILIKE '%institutional%' THEN 'Management'
  ELSE 'State / government quota'
END`;

const LATEST_YEAR = sql`(SELECT MAX(year) FROM closing_ranks WHERE level = 'pg' AND round_label = 'R3')`;

export interface FeeBand {
  family: string;
  colleges: number;
  p10: number | null;
  median: number | null;
  p90: number | null;
}

export interface StateFees {
  state: string;
  colleges: number;
  bands: FeeBand[];
}

export const getPrivatePgFees = unstable_cache(
  async (): Promise<{ year: number | null; states: StateFees[]; national: FeeBand[] }> => {
    const [byState, national, year] = await Promise.all([
      db.execute(sql`
        SELECT st.name AS state, ${FAMILY} AS family,
               COUNT(DISTINCT cr.institute_id)::int AS colleges,
               percentile_cont(0.1) WITHIN GROUP (ORDER BY cr.fee_inr) AS p10,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY cr.fee_inr) AS median,
               percentile_cont(0.9) WITHIN GROUP (ORDER BY cr.fee_inr) AS p90
          FROM closing_ranks cr
          JOIN institutes i ON i.id = cr.institute_id
          JOIN states st ON st.id = i.state_id
          LEFT JOIN quotas q ON q.id = cr.quota_id
         WHERE cr.level = 'pg' AND i.ownership = 'private' AND cr.year = ${LATEST_YEAR} AND cr.fee_inr > 0
         GROUP BY st.name, ${FAMILY}
      `),
      db.execute(sql`
        SELECT ${FAMILY} AS family, COUNT(DISTINCT cr.institute_id)::int AS colleges,
               percentile_cont(0.1) WITHIN GROUP (ORDER BY cr.fee_inr) AS p10,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY cr.fee_inr) AS median,
               percentile_cont(0.9) WITHIN GROUP (ORDER BY cr.fee_inr) AS p90
          FROM closing_ranks cr
          JOIN institutes i ON i.id = cr.institute_id
          LEFT JOIN quotas q ON q.id = cr.quota_id
         WHERE cr.level = 'pg' AND i.ownership = 'private' AND cr.year = ${LATEST_YEAR} AND cr.fee_inr > 0
         GROUP BY ${FAMILY}
      `),
      db.execute(sql`SELECT ${LATEST_YEAR}::int AS y`),
    ]);
    const band = (x: Record<string, unknown>): FeeBand => ({
      family: String(x.family),
      colleges: Number(x.colleges),
      p10: int(x.p10),
      median: int(x.median),
      p90: int(x.p90),
    });
    const map = new Map<string, StateFees>();
    for (const x of rows<Record<string, unknown>>(byState)) {
      const s = map.get(String(x.state)) ?? { state: String(x.state), colleges: 0, bands: [] };
      s.bands.push(band(x));
      s.colleges = Math.max(s.colleges, Number(x.colleges));
      map.set(s.state, s);
    }
    const order = ["State / government quota", "Management", "NRI", "DNB / NBEMS diploma"];
    const sortBands = (b: FeeBand[]) => b.sort((a, c) => order.indexOf(a.family) - order.indexOf(c.family));
    return {
      year: int(rows<Record<string, unknown>>(year)[0]?.y),
      states: [...map.values()].map((s) => ({ ...s, bands: sortBands(s.bands) })).sort((a, b) => b.colleges - a.colleges),
      national: sortBands(rows<Record<string, unknown>>(national).map(band)),
    };
  },
  ["pg-private-fees-v1"],
  { revalidate: 86400, tags: ["seat-data"] },
);

export interface DeemedCollege {
  name: string;
  slug: string;
  state: string | null;
  branches: number;
  mngMedian: number | null;
  mngLow: number | null;
  mngHigh: number | null;
  nriMedian: number | null;
}

export interface DeemedSummary {
  year: number | null;
  colleges: DeemedCollege[];
  /** Management seats across all deemed universities: where they closed, open category. */
  mngRanks: { bestR1: number | null; widest: number | null } | null;
  national: FeeBand[];
}

export const getDeemedPg = unstable_cache(
  async (): Promise<DeemedSummary> => {
    const [colleges, ranks, national, year] = await Promise.all([
      db.execute(sql`
        SELECT i.name, i.slug, st.name AS state,
               COUNT(DISTINCT cr.course_id)::int AS branches,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY cr.fee_inr) FILTER (WHERE ${FAMILY} = 'Management' AND cr.fee_inr > 0) AS mng_median,
               percentile_cont(0.1) WITHIN GROUP (ORDER BY cr.fee_inr) FILTER (WHERE ${FAMILY} = 'Management' AND cr.fee_inr > 0) AS mng_low,
               percentile_cont(0.9) WITHIN GROUP (ORDER BY cr.fee_inr) FILTER (WHERE ${FAMILY} = 'Management' AND cr.fee_inr > 0) AS mng_high,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY cr.fee_inr) FILTER (WHERE ${FAMILY} = 'NRI' AND cr.fee_inr > 0) AS nri_median
          FROM closing_ranks cr
          JOIN institutes i ON i.id = cr.institute_id
          LEFT JOIN states st ON st.id = i.state_id
          LEFT JOIN quotas q ON q.id = cr.quota_id
         WHERE cr.level = 'pg' AND i.ownership = 'deemed' AND cr.year = ${LATEST_YEAR}
         GROUP BY i.name, i.slug, st.name
         ORDER BY mng_median ASC NULLS LAST, i.name
      `),
      db.execute(sql`
        SELECT MIN(cr.closing_rank) FILTER (WHERE cr.round_label = 'R1')::int AS best_r1, MAX(cr.closing_rank)::int AS widest
          FROM closing_ranks cr
          JOIN institutes i ON i.id = cr.institute_id
          LEFT JOIN quotas q ON q.id = cr.quota_id
         WHERE cr.level = 'pg' AND i.ownership = 'deemed' AND cr.year = ${LATEST_YEAR}
           AND ${FAMILY} = 'Management' AND cr.closing_rank > 0
      `),
      db.execute(sql`
        SELECT ${FAMILY} AS family, COUNT(DISTINCT cr.institute_id)::int AS colleges,
               percentile_cont(0.1) WITHIN GROUP (ORDER BY cr.fee_inr) AS p10,
               percentile_cont(0.5) WITHIN GROUP (ORDER BY cr.fee_inr) AS median,
               percentile_cont(0.9) WITHIN GROUP (ORDER BY cr.fee_inr) AS p90
          FROM closing_ranks cr
          JOIN institutes i ON i.id = cr.institute_id
          LEFT JOIN quotas q ON q.id = cr.quota_id
         WHERE cr.level = 'pg' AND i.ownership = 'deemed' AND cr.year = ${LATEST_YEAR} AND cr.fee_inr > 0
         GROUP BY ${FAMILY}
      `),
      db.execute(sql`SELECT ${LATEST_YEAR}::int AS y`),
    ]);
    const r = rows<Record<string, unknown>>(ranks)[0];
    return {
      year: int(rows<Record<string, unknown>>(year)[0]?.y),
      colleges: rows<Record<string, unknown>>(colleges).map((x) => ({
        name: String(x.name),
        slug: String(x.slug),
        state: (x.state as string) ?? null,
        branches: Number(x.branches),
        mngMedian: int(x.mng_median),
        mngLow: int(x.mng_low),
        mngHigh: int(x.mng_high),
        nriMedian: int(x.nri_median),
      })),
      mngRanks: r ? { bestR1: int(r.best_r1), widest: int(r.widest) } : null,
      national: rows<Record<string, unknown>>(national)
        .map((x) => ({ family: String(x.family), colleges: Number(x.colleges), p10: int(x.p10), median: int(x.median), p90: int(x.p90) }))
        .sort((a, b) => b.colleges - a.colleges),
    };
  },
  ["pg-deemed-v1"],
  { revalidate: 86400, tags: ["seat-data"] },
);
