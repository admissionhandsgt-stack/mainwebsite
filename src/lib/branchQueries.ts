/**
 * The PG branches, as pages of their own.
 *
 * "MD Radiology cutoff", "rank required for MD Dermatology", "MD General
 * Medicine closing rank" are among the most-searched queries this business
 * exists to answer, and the site had no page for any of them. The data was
 * already here — 101 branches across 2,168 colleges — reachable only by
 * knowing which college to look inside first, which is backwards: people pick
 * the branch and then find out where it is available.
 *
 * Every figure comes from `seat_options`, the same view the predictor reads,
 * so a branch page and the predictor can never disagree about a rank.
 */

import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { logError } from "@/lib/logger";

const rows = <T,>(r: unknown) => r as unknown as T[];

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
  /** The tightest round-1 close anywhere, and the widest any round reached. */
  bestRank: number | null;
  widestRank: number | null;
  minFee: number | null;
}

async function loadBranches(): Promise<BranchSummary[]> {
  try {
    const r = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT c.name,
               COUNT(DISTINCT so.institute_id)::int AS colleges,
               COUNT(*)::int                        AS seats,
               MIN(so.r1_latest)::int               AS best_rank,
               MAX(so.widest_latest)::int           AS widest_rank,
               MIN(so.fee_inr)::bigint              AS min_fee
          FROM seat_options so
          JOIN courses c ON c.id = so.course_id
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
      minFee: x.min_fee != null ? Number(x.min_fee) : null,
    }));
  } catch (error) {
    logError(error, { route: "branchQueries:list" });
    return [];
  }
}

/** Only moves when an import runs. */
export const getBranches = unstable_cache(loadBranches, ["pg-branches-seo"], {
  revalidate: 86400,
  tags: ["closing-ranks"],
});

export interface BranchCollege {
  name: string;
  slug: string;
  state: string | null;
  ownership: string;
  seats: number;
  /** Round 1's close, and the widest any round in that year reached. */
  r1: number | null;
  widest: number | null;
  feeInr: number | null;
}

export interface BranchDetail extends BranchSummary {
  /** Categories this branch actually publishes, commonest first. */
  categories: string[];
  states: number;
  year: number | null;
  /** The colleges, easiest seat first — which is the order a candidate reads. */
  colleges_list: BranchCollege[];
  /** Seats whose later rounds reached further than round 1 did. */
  movedCount: number;
}

async function loadBranch(slug: string): Promise<BranchDetail | null> {
  const all = await getBranches();
  const summary = all.find((b) => b.slug === slug);
  if (!summary) return null;

  try {
    const [collegeRows, catRows, meta] = await Promise.all([
      db.execute(sql`
        SELECT i.name, i.slug, st.name AS state, i.ownership::text AS ownership,
               COUNT(*)::int            AS seats,
               MIN(so.r1_latest)::int   AS r1,
               MAX(so.widest_latest)::int AS widest,
               MIN(so.fee_inr)::bigint  AS fee_inr
          FROM seat_options so
          JOIN courses c   ON c.id = so.course_id
          JOIN institutes i ON i.id = so.institute_id
          LEFT JOIN states st ON st.id = i.state_id
         WHERE so.level = 'pg' AND c.name = ${summary.name}
         GROUP BY i.name, i.slug, st.name, i.ownership
         ORDER BY MAX(so.widest_latest) DESC NULLS LAST
         LIMIT 400
      `),
      db.execute(sql`
        SELECT cat.code, COUNT(*)::int AS n
          FROM seat_options so
          JOIN courses c ON c.id = so.course_id
          JOIN categories cat ON cat.id = so.category_id
         WHERE so.level = 'pg' AND c.name = ${summary.name}
         GROUP BY cat.code ORDER BY n DESC LIMIT 8
      `),
      db.execute(sql`
        SELECT COUNT(DISTINCT i.state_id)::int AS states,
               MAX(so.latest_year)::int        AS year,
               COUNT(*) FILTER (
                 WHERE so.widest_latest IS NOT NULL AND so.r1_latest IS NOT NULL
                   AND so.widest_latest > so.r1_latest
               )::int AS moved
          FROM seat_options so
          JOIN courses c ON c.id = so.course_id
          JOIN institutes i ON i.id = so.institute_id
         WHERE so.level = 'pg' AND c.name = ${summary.name}
      `),
    ]);

    const m = rows<Record<string, unknown>>(meta)[0] ?? {};

    return {
      ...summary,
      categories: rows<{ code: string }>(catRows).map((x) => x.code),
      states: (m.states as number) ?? 0,
      year: (m.year as number) ?? null,
      movedCount: (m.moved as number) ?? 0,
      colleges_list: rows<Record<string, unknown>>(collegeRows).map((x) => ({
        name: x.name as string,
        slug: x.slug as string,
        state: (x.state as string) ?? null,
        ownership: x.ownership as string,
        seats: x.seats as number,
        r1: (x.r1 as number) ?? null,
        widest: (x.widest as number) ?? null,
        feeInr: x.fee_inr != null ? Number(x.fee_inr) : null,
      })),
    };
  } catch (error) {
    logError(error, { route: `branchQueries:${slug}` });
    return null;
  }
}

export const getBranch = (slug: string) =>
  unstable_cache(() => loadBranch(slug), ["pg-branch", slug], {
    revalidate: 86400,
    tags: ["closing-ranks"],
  })();
