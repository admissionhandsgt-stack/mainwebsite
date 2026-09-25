/**
 * The PG branches, as pages of their own.
 *
 * "MD Radiology cutoff", "rank required for MD Dermatology" are among the
 * most-searched queries this business exists to answer, and the data was
 * reachable only by knowing which college to open first — backwards from how
 * somebody chooses.
 *
 * ## One row must describe one seat
 *
 * The first version of this grouped by college and took `MIN(r1)`, `MAX(widest)`
 * and `MIN(fee)` across everything that college offered. Every one of those
 * three numbers then came from a different seat, and the row described none of
 * them. KVG Medical College read "round 1 at rank 2,130, reaches 2,20,761,
 * ₹7.83 lakh a year" — but rank 2,130 is a Karnataka government-quota seat,
 * 2,20,761 is a management seat, and that management seat costs up to ₹1.6
 * crore. The row invited a candidate to believe they could take a ₹7.83 lakh
 * seat at rank 2.2 lakh. No such seat exists.
 *
 * North Bengal was the same fault through category rather than quota: rank 74
 * is a general seat and 2,26,217 is SC-PwD, shown as one range.
 *
 * So the grain is now **college + quota, within one category**. Fee, round-1
 * close and widest reach on a row all describe the same seat, and the category
 * is chosen rather than averaged over — a candidate is in exactly one.
 *
 * Fee is single-valued at this grain in 55,592 of 55,689 groups, so a row can
 * state a fee rather than a range; the handful that vary show one.
 *
 * Every figure comes from `seat_options`, the same view the predictor reads, so
 * a branch page and the predictor cannot disagree about a rank.
 */

import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { logError } from "@/lib/logger";

const rows = <T,>(r: unknown) => r as unknown as T[];

/** What a general-category candidate sees unless they pick otherwise. */
export const DEFAULT_CATEGORY = "GEN";

/** "MD Radio Diagnosis" -> "md-radio-diagnosis". Stable, so links do not rot. */
export function branchSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export interface BranchSummary {
  name: string;
  slug: string;
  colleges: number;
  seats: number;
  /**
   * General-category only, and labelled as such wherever shown. Across all
   * categories these would mix a general seat with a reserved one, which is
   * the fault described at the top of this file.
   */
  bestRank: number | null;
  widestRank: number | null;
}

async function loadBranches(): Promise<BranchSummary[]> {
  try {
    const r = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT c.name,
               COUNT(DISTINCT so.institute_id)::int AS colleges,
               COUNT(*)::int                        AS seats,
               MIN(so.r1_latest) FILTER (WHERE cat.code = ${DEFAULT_CATEGORY})::int     AS best_rank,
               MAX(so.widest_latest) FILTER (WHERE cat.code = ${DEFAULT_CATEGORY})::int AS widest_rank
          FROM seat_options so
          JOIN courses c ON c.id = so.course_id
          LEFT JOIN categories cat ON cat.id = so.category_id
         WHERE so.level = 'pg'
         GROUP BY c.name
         ORDER BY seats DESC
      `),
    );

    return r.map((x) => ({
      name: x.name as string,
      slug: branchSlug(x.name as string),
      colleges: x.colleges as number,
      seats: x.seats as number,
      bestRank: (x.best_rank as number) ?? null,
      widestRank: (x.widest_rank as number) ?? null,
    }));
  } catch (error) {
    logError(error, { route: "branchQueries:list" });
    return [];
  }
}

/** Only moves when an import runs. */
export const getBranches = unstable_cache(loadBranches, ["pg-branches-seo-v2"], {
  revalidate: 86400,
  tags: ["closing-ranks"],
});

/** One real seat type: this college, this quota, the chosen category. */
export interface BranchSeat {
  college: string;
  slug: string;
  state: string | null;
  ownership: string;
  quota: string;
  seats: number;
  r1: number | null;
  widest: number | null;
  feeInr: number | null;
  /** Set only where the fee is not single-valued at this grain. */
  feeMaxInr: number | null;
}

export interface BranchDetail extends BranchSummary {
  /** Categories this branch publishes, commonest first, for the switcher. */
  categories: string[];
  category: string;
  states: number;
  year: number | null;
  seatsInCategory: number;
  /** Widest reach first — the seats most ranks can actually reach. */
  rowsList: BranchSeat[];
  truncated: boolean;
  /** Seats in this category whose later rounds reached further than round 1. */
  movedCount: number;
}

const ROW_LIMIT = 300;

async function loadBranch(slug: string, category: string): Promise<BranchDetail | null> {
  const all = await getBranches();
  const summary = all.find((b) => b.slug === slug);
  if (!summary) return null;

  try {
    const [seatRows, catRows, meta] = await Promise.all([
      // Grouped by quota as well as college, so every number on a row belongs
      // to the same kind of seat.
      db.execute(sql`
        SELECT i.name, i.slug, st.name AS state, i.ownership::text AS ownership,
               COALESCE(q.label, 'Not stated') AS quota,
               SUM(COALESCE(so.seats_latest, 1))::int AS seats,
               MIN(so.r1_latest)::int      AS r1,
               MAX(so.widest_latest)::int  AS widest,
               -- Zero means "not published", not free. See quotaQueries.ts.
               MIN(NULLIF(so.fee_inr, 0))::bigint AS fee_min,
               MAX(NULLIF(so.fee_inr, 0))::bigint AS fee_max
          FROM seat_options so
          JOIN courses c    ON c.id = so.course_id
          JOIN institutes i ON i.id = so.institute_id
          LEFT JOIN states st   ON st.id = i.state_id
          LEFT JOIN quotas q    ON q.id = so.quota_id
          LEFT JOIN categories cat ON cat.id = so.category_id
         WHERE so.level = 'pg' AND c.name = ${summary.name} AND cat.code = ${category}
         GROUP BY i.name, i.slug, st.name, i.ownership, q.label
         ORDER BY MAX(so.widest_latest) DESC NULLS LAST
         LIMIT ${ROW_LIMIT + 1}
      `),
      db.execute(sql`
        SELECT cat.code, COUNT(*)::int AS n
          FROM seat_options so
          JOIN courses c ON c.id = so.course_id
          JOIN categories cat ON cat.id = so.category_id
         WHERE so.level = 'pg' AND c.name = ${summary.name}
         GROUP BY cat.code ORDER BY n DESC LIMIT 10
      `),
      db.execute(sql`
        SELECT COUNT(DISTINCT i.state_id)::int AS states,
               MAX(so.latest_year)::int        AS year,
               COUNT(*)::int                   AS seats_in_category,
               COUNT(*) FILTER (
                 WHERE so.widest_latest IS NOT NULL AND so.r1_latest IS NOT NULL
                   AND so.widest_latest > so.r1_latest
               )::int AS moved
          FROM seat_options so
          JOIN courses c ON c.id = so.course_id
          JOIN institutes i ON i.id = so.institute_id
          LEFT JOIN categories cat ON cat.id = so.category_id
         WHERE so.level = 'pg' AND c.name = ${summary.name} AND cat.code = ${category}
      `),
    ]);

    const m = rows<Record<string, unknown>>(meta)[0] ?? {};
    const raw = rows<Record<string, unknown>>(seatRows);

    return {
      ...summary,
      category,
      categories: rows<{ code: string }>(catRows).map((x) => x.code),
      states: (m.states as number) ?? 0,
      year: (m.year as number) ?? null,
      seatsInCategory: (m.seats_in_category as number) ?? 0,
      movedCount: (m.moved as number) ?? 0,
      truncated: raw.length > ROW_LIMIT,
      rowsList: raw.slice(0, ROW_LIMIT).map((x) => {
        const min = x.fee_min != null ? Number(x.fee_min) : null;
        const max = x.fee_max != null ? Number(x.fee_max) : null;
        return {
          college: x.name as string,
          slug: x.slug as string,
          state: (x.state as string) ?? null,
          ownership: x.ownership as string,
          quota: x.quota as string,
          seats: x.seats as number,
          r1: (x.r1 as number) ?? null,
          widest: (x.widest as number) ?? null,
          feeInr: min,
          feeMaxInr: max != null && min != null && max !== min ? max : null,
        };
      }),
    };
  } catch (error) {
    logError(error, { route: `branchQueries:${slug}:${category}` });
    return null;
  }
}

export const getBranch = (slug: string, category = DEFAULT_CATEGORY) =>
  unstable_cache(() => loadBranch(slug, category), ["pg-branch-v2", slug, category], {
    revalidate: 86400,
    tags: ["closing-ranks"],
  })();
