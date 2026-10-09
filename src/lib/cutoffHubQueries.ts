/**
 * The national cutoff, stipend and BDS pages — the searches people actually
 * type ("MBBS cutoff for government college", "NEET PG cutoff branch wise",
 * "NEET PG stipend state wise", "BDS colleges in India"), answered from the
 * same counselling data as the predictor.
 *
 * **Every figure is a range over a named group, never a seat.** A category's
 * row says "the tightest All India Quota seat closed at AIR 1,772 in round 1;
 * the furthest any round reached was 27,316" — both ends named, within one
 * counselling, one course and one category. Nothing here can be turned back
 * into which college sits where, so these pages are free to read and need no
 * gate; the per-college rows stay behind it (see CLAUDE.md, "Googlebot reads
 * it, a visitor signs in").
 *
 * A year's cutoff is read from `closing_ranks` for that year, not from
 * `seat_options`: the view keeps each seat's *latest* year, so a seat with 2026
 * rounds would drop out of a 2025 summary.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { branchSlug } from "@/lib/branchSlug";
import { logError } from "@/lib/logger";

const rows = <T,>(r: unknown) => r as unknown as T[];
const num = (v: unknown) => (v == null ? null : Number(v));

export const UG_AIQ = "All India Quota UG";
export const PG_AIQ = "All India PG";

/** Category display order: open first, then reserved, then PwD. */
const CATEGORY_ORDER = ["UR", "GEN", "EWS", "OBC", "SC", "ST"];
export function categoryRank(code: string) {
  const base = code.replace(/[\s-]*PwD$/i, "").trim();
  const i = CATEGORY_ORDER.indexOf(base);
  return (/pwd/i.test(code) ? 100 : 0) + (i < 0 ? 50 : i);
}

export interface CategoryCut {
  category: string;
  seats: number;
  colleges: number;
  /** Tightest round-1 closing rank in this group. */
  bestR1: number | null;
  /** Furthest any round of the year reached in this group. */
  widest: number | null;
}

export interface YearCuts {
  year: number;
  rounds: string[];
  categories: CategoryCut[];
}

async function aiqByCategory(counselling: string, course: string | null): Promise<YearCuts[]> {
  const r = rows<Record<string, unknown>>(
    await db.execute(sql`
      SELECT cr.year, cat.code AS category,
             COUNT(DISTINCT (cr.institute_id, cr.course_id, cr.quota_id))::int AS seats,
             COUNT(DISTINCT cr.institute_id)::int AS colleges,
             MIN(cr.closing_rank) FILTER (WHERE cr.round_label = 'R1')::int AS best_r1,
             MAX(cr.closing_rank)::int AS widest,
             string_agg(DISTINCT cr.round_label, ',') AS rounds
        FROM closing_ranks cr
        JOIN counsellings c ON c.id = cr.counselling_id
        JOIN categories cat ON cat.id = cr.category_id
        JOIN courses co ON co.id = cr.course_id
        LEFT JOIN quotas q ON q.id = cr.quota_id
       WHERE c.name = ${counselling}
         AND cr.closing_rank > 0
         AND (${course}::text IS NULL OR co.name ILIKE ${course})
         -- The AIQ counselling also allots ESI, Delhi University and other
         -- quotas with their own eligibility; the national cutoff is the
         -- All India Quota itself.
         AND (q.label IS NULL OR q.label ILIKE 'All India%' OR q.label ILIKE 'AIQ%')
       GROUP BY cr.year, cat.code
    `),
  );
  const byYear = new Map<number, YearCuts>();
  for (const x of r) {
    const year = Number(x.year);
    const y = byYear.get(year) ?? { year, rounds: [], categories: [] };
    y.categories.push({
      category: String(x.category),
      seats: Number(x.seats),
      colleges: Number(x.colleges),
      bestR1: num(x.best_r1),
      widest: num(x.widest),
    });
    for (const rd of String(x.rounds ?? "").split(",")) if (rd && !y.rounds.includes(rd)) y.rounds.push(rd);
    byYear.set(year, y);
  }
  return [...byYear.values()]
    .map((y) => ({
      ...y,
      rounds: y.rounds.sort(),
      categories: y.categories.sort((a, b) => categoryRank(a.category) - categoryRank(b.category)),
    }))
    .sort((a, b) => b.year - a.year);
}

/** NEET UG: All India Quota closing ranks by category, per year, for one course. */
export const getUgAiqCuts = unstable_cache(
  async (course: "MBBS" | "BDS") => aiqByCategory(UG_AIQ, course),
  ["hub-ug-aiq-v1"],
  { revalidate: 86400, tags: ["seat-data"] },
);

/** NEET PG: All India Quota closing ranks by category, per year, all branches together. */
export const getPgAiqCuts = unstable_cache(async () => aiqByCategory(PG_AIQ, null), ["hub-pg-aiq-v1"], {
  revalidate: 86400,
  tags: ["seat-data"],
});

export interface BranchCut {
  branch: string;
  slug: string;
  colleges: number;
  seats: number;
  bestR1: number | null;
  widest: number | null;
}

/** NEET PG branch-wise: All India Quota, one category, one year. */
export const getPgAiqBranches = unstable_cache(
  async (category: string, year: number): Promise<BranchCut[]> => {
    const r = rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT co.name AS branch,
               COUNT(DISTINCT cr.institute_id)::int AS colleges,
               COUNT(DISTINCT (cr.institute_id, cr.quota_id))::int AS seats,
               MIN(cr.closing_rank) FILTER (WHERE cr.round_label = 'R1')::int AS best_r1,
               MAX(cr.closing_rank)::int AS widest
          FROM closing_ranks cr
          JOIN counsellings c ON c.id = cr.counselling_id
          JOIN categories cat ON cat.id = cr.category_id
          JOIN courses co ON co.id = cr.course_id
          LEFT JOIN quotas q ON q.id = cr.quota_id
         WHERE c.name = ${PG_AIQ} AND cat.code = ${category} AND cr.year = ${year} AND cr.closing_rank > 0
           -- The AIQ seats themselves; the same counselling's NRI and management
           -- (deemed) seats close at entirely different ranks.
           AND (q.label IS NULL OR q.label ILIKE 'All India%' OR q.label ILIKE 'AIQ%')
         GROUP BY co.name
         ORDER BY MAX(cr.closing_rank) ASC
      `),
    );
    return r.map((x) => ({
      branch: String(x.branch),
      slug: branchSlug(String(x.branch)),
      colleges: Number(x.colleges),
      seats: Number(x.seats),
      bestR1: num(x.best_r1),
      widest: num(x.widest),
    }));
  },
  ["hub-pg-aiq-branches-v1"],
  { revalidate: 86400, tags: ["seat-data"] },
);

/* ------------------------------ stipend ------------------------------ */

export interface StateStipend {
  state: string;
  colleges: number;
  median: number;
  min: number;
  max: number;
  govtMedian: number | null;
  privateMedian: number | null;
}

export interface CollegeStipend {
  name: string;
  slug: string;
  state: string | null;
  ownership: string;
  y1: number;
  y2: number | null;
  y3: number | null;
}

/**
 * One monthly first-year stipend per PG college: the most recent year it
 * published one. Only rows recorded per month — mixing in an annual figure
 * would read as twelve times the stipend.
 */
const LATEST_STIPEND = sql`
  SELECT DISTINCT ON (f.institute_id)
         f.institute_id, f.stipend_y1_inr AS y1, f.stipend_y2_inr AS y2, f.stipend_y3_inr AS y3
    FROM fees f
   WHERE f.level = 'pg' AND f.stipend_y1_inr > 0 AND f.stipend_periodicity = 'per_month'
   ORDER BY f.institute_id, f.year DESC NULLS LAST, f.stipend_y1_inr DESC
`;

export const getStipends = unstable_cache(
  async (): Promise<{
    states: StateStipend[];
    top: CollegeStipend[];
    colleges: number;
    median: number;
    govtMedian: number | null;
    privateMedian: number | null;
  }> => {
    try {
      const [st, top, all] = await Promise.all([
        db.execute(sql`
          WITH s AS (${LATEST_STIPEND})
          SELECT stt.name AS state, COUNT(*)::int AS colleges,
                 percentile_cont(0.5) WITHIN GROUP (ORDER BY s.y1) AS median,
                 MIN(s.y1) AS min, MAX(s.y1) AS max,
                 percentile_cont(0.5) WITHIN GROUP (ORDER BY s.y1) FILTER (WHERE i.ownership = 'government') AS govt,
                 percentile_cont(0.5) WITHIN GROUP (ORDER BY s.y1) FILTER (WHERE i.ownership IN ('private', 'deemed')) AS private
            FROM s JOIN institutes i ON i.id = s.institute_id
            JOIN states stt ON stt.id = i.state_id
           WHERE i.is_active = true
           GROUP BY stt.name
          HAVING COUNT(*) >= 3
           ORDER BY median DESC
        `),
        db.execute(sql`
          WITH s AS (${LATEST_STIPEND})
          SELECT i.name, i.slug, stt.name AS state, i.ownership::text AS ownership, s.y1, s.y2, s.y3
            FROM s JOIN institutes i ON i.id = s.institute_id
            LEFT JOIN states stt ON stt.id = i.state_id
           WHERE i.is_active = true
           ORDER BY s.y1 DESC, i.name
           LIMIT 25
        `),
        db.execute(sql`
          WITH s AS (${LATEST_STIPEND})
          SELECT COUNT(*)::int AS n, percentile_cont(0.5) WITHIN GROUP (ORDER BY s.y1) AS median,
                 percentile_cont(0.5) WITHIN GROUP (ORDER BY s.y1) FILTER (WHERE i.ownership = 'government') AS govt,
                 percentile_cont(0.5) WITHIN GROUP (ORDER BY s.y1) FILTER (WHERE i.ownership IN ('private', 'deemed')) AS private
            FROM s JOIN institutes i ON i.id = s.institute_id
        `),
      ]);
      const a = rows<Record<string, unknown>>(all)[0] ?? {};
      return {
        colleges: Number(a.n ?? 0),
        govtMedian: a.govt == null ? null : Math.round(Number(a.govt)),
        privateMedian: a.private == null ? null : Math.round(Number(a.private)),
        median: Math.round(Number(a.median ?? 0)),
        states: rows<Record<string, unknown>>(st).map((x) => ({
          state: String(x.state),
          colleges: Number(x.colleges),
          median: Math.round(Number(x.median)),
          min: Math.round(Number(x.min)),
          max: Math.round(Number(x.max)),
          govtMedian: x.govt == null ? null : Math.round(Number(x.govt)),
          privateMedian: x.private == null ? null : Math.round(Number(x.private)),
        })),
        top: rows<Record<string, unknown>>(top).map((x) => ({
          name: String(x.name),
          slug: String(x.slug),
          state: (x.state as string) ?? null,
          ownership: String(x.ownership),
          y1: Math.round(Number(x.y1)),
          y2: x.y2 == null ? null : Math.round(Number(x.y2)),
          y3: x.y3 == null ? null : Math.round(Number(x.y3)),
        })),
      };
    } catch (error) {
      logError(error, { route: "cutoffHubQueries:stipend" });
      throw error;
    }
  },
  ["hub-stipend-v2"],
  { revalidate: 86400, tags: ["seat-data"] },
);

/* -------------------------------- BDS -------------------------------- */

export interface BdsCollege {
  name: string;
  slug: string;
  state: string | null;
  established: number | null;
  options: number;
}

/** Every college with published BDS closing ranks, by state. */
export const getBdsColleges = unstable_cache(
  async (): Promise<{ colleges: BdsCollege[]; counsellings: { name: string; colleges: number }[] }> => {
    const [c, k] = await Promise.all([
      db.execute(sql`
        SELECT i.name, i.slug, st.name AS state, i.established_year, COUNT(*)::int AS options
          FROM seat_options so
          JOIN institutes i ON i.id = so.institute_id
          JOIN courses co ON co.id = so.course_id
          LEFT JOIN states st ON st.id = i.state_id
         WHERE so.level = 'ug' AND co.name ILIKE 'BDS' AND i.is_active = true
         GROUP BY i.name, i.slug, st.name, i.established_year
         ORDER BY st.name NULLS LAST, i.name
      `),
      db.execute(sql`
        SELECT c.name, COUNT(DISTINCT so.institute_id)::int AS colleges
          FROM seat_options so
          JOIN courses co ON co.id = so.course_id
          JOIN counsellings c ON c.id = so.counselling_id
         WHERE so.level = 'ug' AND co.name ILIKE 'BDS'
         GROUP BY c.name ORDER BY colleges DESC
      `),
    ]);
    return {
      colleges: rows<Record<string, unknown>>(c).map((x) => ({
        name: String(x.name),
        slug: String(x.slug),
        state: (x.state as string) ?? null,
        established: num(x.established_year),
        options: Number(x.options),
      })),
      counsellings: rows<Record<string, unknown>>(k).map((x) => ({ name: String(x.name), colleges: Number(x.colleges) })),
    };
  },
  ["hub-bds-v1"],
  { revalidate: 86400, tags: ["seat-data"] },
);

/* ------------------------- AYUSH and other UG ------------------------- */

export interface OtherUgCollege {
  course: string;
  name: string;
  slug: string;
  state: string | null;
}

/**
 * Colleges whose NEET UG seats are not MBBS or BDS — BAMS, BHMS, BUMS, BSMS,
 * B.Sc Nursing, BVSc. Each already had a page; none was linked from anywhere
 * (162 orphans in the 2026-10-09 crawl), because the MBBS directory rightly
 * leaves them out. /ayush-colleges lists them.
 */
export const getOtherUgColleges = unstable_cache(
  async (): Promise<OtherUgCollege[]> =>
    rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT DISTINCT co.name AS course, i.name, i.slug, st.name AS state
          FROM seat_options so
          JOIN courses co ON co.id = so.course_id
          JOIN institutes i ON i.id = so.institute_id
          LEFT JOIN states st ON st.id = i.state_id
         WHERE so.level = 'ug' AND co.name NOT ILIKE 'MBBS' AND co.name NOT ILIKE 'BDS' AND i.is_active = true
         ORDER BY co.name, st.name NULLS LAST, i.name
      `),
    ).map((x) => ({ course: String(x.course), name: String(x.name), slug: String(x.slug), state: (x.state as string) ?? null })),
  ["hub-other-ug-v1"],
  { revalidate: 86400, tags: ["seat-data"] },
);
