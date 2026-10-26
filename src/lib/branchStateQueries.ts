/**
 * `/md-ms-india/branches/[slug]/[state]` — "MD Radiology cutoff Rajasthan", "MS Orthopaedics seats in
 * Maharashtra", "MD General Medicine fees Karnataka" (2026-10-26). A competitor ranks for these with one
 * page per state × branch carrying a single rank table; ours carries what a family decides on.
 *
 * Which pages exist: the most-searched clinical MD/MS branches (`BRANCH_STATE_COURSES`) in every state
 * where at least `MIN_STATE_COLLEGES` colleges offer the branch — 143 pages on 2026-10-26. A thinner
 * combination is a 404, not a page: two colleges' figures are those colleges' cuts under another name.
 *
 * What a page states, under the same rules as the state and branch pages:
 *  - Ranks only over three or more colleges (`groupRank`), open / general merit in each counselling's
 *    own code, by quota; the latest live MCC round's last rank per category in the state, AIQ and
 *    deemed paid seats, also only over three or more colleges.
 *  - Fees as the median and the middle 80% (10th–90th percentile) per quota, from `seat_options`
 *    (an official 2026-27 fee wins there), one figure per college — never min–max, whose ends are slips.
 *  - The colleges by name, never with a rank beside them.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { branchSlug } from "@/lib/branchSlug";
import { groupRank, MIN_GROUP } from "@/lib/chance";
import { OPEN_CATEGORY_CODES } from "@/lib/pgStateQueries";
import { getLatestLiveRound } from "@/lib/mccResults";
import { CUT_CATS, quotaFamily, shortCategory, type CutCat } from "@/lib/mccRoundTypes";

const rows = <T,>(r: unknown) => r as unknown as T[];
const num = (v: unknown) => (v == null ? null : Number(v));
const DAY = 86400;

/** The clinical branches families search state by state, most searched first. */
export const BRANCH_STATE_COURSES = [
  "MD Radio Diagnosis",
  "MD General Medicine",
  "MD Dermatology, Venereology & Leprosy",
  "MD Paediatrics",
  "MS General Surgery",
  "MS Obstetrics & Gynaecology",
  "MS Orthopaedics",
];

/** The words people type for the long official names (titles and headings only). */
export const SEARCH_NAME: Record<string, string> = {
  "MD Radio Diagnosis": "MD Radiology",
  "MD Dermatology, Venereology & Leprosy": "MD Dermatology",
  "MS Obstetrics & Gynaecology": "MS OBG",
};

export const MIN_STATE_COLLEGES = 5;

export interface BranchStateCombo {
  course: string;
  courseSlug: string;
  state: string;
  stateSlug: string;
  colleges: number;
}

const courseList = sql.join(BRANCH_STATE_COURSES.map((c) => sql`${c}`), sql`, `);
const openCodes = sql.join(OPEN_CATEGORY_CODES.map((c) => sql`${c}`), sql`, `);

export const getBranchStateCombos = unstable_cache(
  async (): Promise<BranchStateCombo[]> =>
    rows<Record<string, unknown>>(
      await db.execute(sql`
        SELECT c.name AS course, st.name AS state, st.slug AS state_slug, COUNT(DISTINCT so.institute_id)::int AS colleges
          FROM seat_options so
          JOIN institutes i ON i.id = so.institute_id
          JOIN states st ON st.id = i.state_id
          JOIN courses c ON c.id = so.course_id
         WHERE so.level = 'pg' AND i.is_active = true AND c.name IN (${courseList})
         GROUP BY c.name, st.name, st.slug
        HAVING COUNT(DISTINCT so.institute_id) >= ${MIN_STATE_COLLEGES}
         ORDER BY c.name, colleges DESC, st.name
      `),
    ).map((x) => ({
      course: String(x.course),
      courseSlug: branchSlug(String(x.course)),
      state: String(x.state),
      stateSlug: String(x.state_slug),
      colleges: Number(x.colleges),
    })),
  ["branch-state-combos-v1"],
  { revalidate: DAY, tags: ["seat-data"] },
);

export interface BranchStateQuota {
  quota: string;
  counselling: string;
  colleges: number;
  bestR1: number | null;
  widest: number | null;
  /** True while the figure is the state's own merit number, not an AIR (migration 0045 turns these into AIRs). */
  stateRank: boolean;
  /** One fee per college for the quota: median and the middle 80%, only over three or more colleges. */
  feeColleges: number;
  feeMedian: number | null;
  feeP10: number | null;
  feeP90: number | null;
}

export interface BranchStateRound {
  year: number;
  label: string;
  slug: string;
  final: boolean;
  /** Per seat family, the last rank admitted in each category in this state — 3+ colleges only. */
  aiq: Partial<Record<CutCat, number>>;
  deemed: Partial<Record<CutCat, number>>;
  aiqColleges: number;
  deemedColleges: number;
  aiqSeats: number;
  deemedSeats: number;
}

export interface BranchState extends BranchStateCombo {
  year: number | null;
  colleges: number;
  collegeList: { name: string; slug: string; ownership: string }[];
  ownership: Record<string, number>;
  quotas: BranchStateQuota[];
  round: BranchStateRound | null;
}

async function load(courseSlug: string, stateSlug: string): Promise<BranchState | null> {
  const combo = (await getBranchStateCombos()).find((c) => c.courseSlug === courseSlug && c.stateSlug === stateSlug);
  if (!combo) return null;
  const st = rows<{ id: number }>(await db.execute(sql`SELECT id FROM states WHERE slug = ${stateSlug} LIMIT 1`))[0];
  if (!st) return null;
  const stateId = Number(st.id);
  const course = sql`(SELECT id FROM courses WHERE name = ${combo.course})`;

  const [colleges, year] = await Promise.all([
    db.execute(sql`
      SELECT i.name, i.slug, i.ownership::text AS ownership
        FROM institutes i
       WHERE i.is_active = true AND i.state_id = ${stateId}
         AND EXISTS (SELECT 1 FROM seat_options so WHERE so.institute_id = i.id AND so.level = 'pg' AND so.course_id IN ${course})
       ORDER BY CASE i.ownership WHEN 'government' THEN 0 WHEN 'deemed' THEN 1 WHEN 'private' THEN 2 ELSE 3 END, i.name
    `),
    // The latest year the state's counselling ran to round 3 for this branch, else the latest at all.
    db.execute(sql`
      SELECT COALESCE(MAX(cr.year) FILTER (WHERE cr.round_label = 'R3'), MAX(cr.year))::int AS y
        FROM closing_ranks cr JOIN institutes i ON i.id = cr.institute_id
       WHERE cr.level = 'pg' AND i.state_id = ${stateId} AND cr.course_id IN ${course}
    `),
  ]);
  const collegeList = rows<Record<string, unknown>>(colleges).map((x) => ({
    name: String(x.name),
    slug: String(x.slug),
    ownership: String(x.ownership),
  }));
  const y = num(rows<Record<string, unknown>>(year)[0]?.y);

  const [quotas, fees] = await Promise.all([
    y == null
      ? Promise.resolve([])
      : db.execute(sql`
          SELECT q.label AS quota, MIN(c.name) AS counselling,
                 COUNT(DISTINCT cr.institute_id)::int AS colleges,
                 MIN(cr.closing_rank) FILTER (WHERE cr.round_label = 'R1')::int AS best_r1,
                 MAX(cr.closing_rank)::int AS widest,
                 bool_or(cr.rank_basis = 'State/Counselling rank' AND cr.closing_rank = cr.counselling_rank) AS state_rank
            FROM closing_ranks cr
            JOIN institutes i ON i.id = cr.institute_id
            JOIN counsellings c ON c.id = cr.counselling_id
            JOIN categories cat ON cat.id = cr.category_id
            LEFT JOIN quotas q ON q.id = cr.quota_id
           WHERE cr.level = 'pg' AND i.state_id = ${stateId} AND cr.course_id IN ${course} AND cr.year = ${y}
             AND cat.code IN (${openCodes}) AND cr.closing_rank > 0
           GROUP BY q.label
           ORDER BY COUNT(DISTINCT cr.institute_id) DESC
           LIMIT 10
        `),
    db.execute(sql`
      WITH per AS (
        SELECT q.label AS quota, so.institute_id, MAX(NULLIF(so.fee_inr, 0)) AS fee
          FROM seat_options so
          JOIN institutes i ON i.id = so.institute_id
          LEFT JOIN quotas q ON q.id = so.quota_id
         WHERE so.level = 'pg' AND i.state_id = ${stateId} AND so.course_id IN ${course}
         GROUP BY q.label, so.institute_id)
      SELECT quota, COUNT(fee)::int AS colleges,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY fee) AS median,
             percentile_cont(0.1) WITHIN GROUP (ORDER BY fee) AS p10,
             percentile_cont(0.9) WITHIN GROUP (ORDER BY fee) AS p90
        FROM per WHERE fee IS NOT NULL GROUP BY quota
    `),
  ]);
  const feeBy = new Map(
    rows<Record<string, unknown>>(fees).map((x) => [String(x.quota ?? "—"), x]),
  );

  const ownership: Record<string, number> = {};
  for (const c of collegeList) ownership[c.ownership] = (ownership[c.ownership] ?? 0) + 1;

  return {
    ...combo,
    year: y,
    colleges: collegeList.length,
    collegeList,
    ownership,
    quotas: rows<Record<string, unknown>>(quotas).map((x) => {
      const quota = String(x.quota ?? "—");
      const f = feeBy.get(quota);
      const fc = f ? Number(f.colleges) : 0;
      const money = (v: unknown) => (fc >= MIN_GROUP && v != null ? Math.round(Number(v)) : null);
      return {
        quota,
        counselling: String(x.counselling),
        colleges: Number(x.colleges),
        bestR1: groupRank(num(x.best_r1), Number(x.colleges)),
        widest: groupRank(num(x.widest), Number(x.colleges)),
        stateRank: Boolean(x.state_rank),
        feeColleges: fc,
        feeMedian: money(f?.median),
        feeP10: money(f?.p10),
        feeP90: money(f?.p90),
      };
    }),
    round: await loadRound(combo, stateId),
  };
}

/** The latest live MCC round, read for this branch in this state. */
async function loadRound(combo: BranchStateCombo, stateId: number): Promise<BranchStateRound | null> {
  const live = await getLatestLiveRound();
  if (!live) return null;
  const r = rows<{ quota: string | null; acat: string | null; inst: string; rank: number }>(
    await db.execute(sql`
      SELECT a.quota, a.allotted_category AS acat, COALESCE(a.institute_id::text, a.mcc_college_name) AS inst, a.rank
        FROM mcc_allotments a
        LEFT JOIN institutes i ON i.id = a.institute_id
       WHERE a.year = ${live.year} AND a.round = ${live.spec.round}
         AND a.course_id IN (SELECT id FROM courses WHERE name = ${combo.course})
         AND (i.state_id = ${stateId} OR (a.institute_id IS NULL AND lower(a.state) = lower(${combo.state})))
    `),
  );
  if (!r.length) return null;
  const fam = (key: "aiq" | "deemed") => {
    const mine = r.filter((x) => quotaFamily(x.quota) === key);
    const out: Partial<Record<CutCat, number>> = {};
    for (const cat of CUT_CATS) {
      const c = mine.filter((x) => shortCategory(x.acat) === cat);
      const colleges = new Set(c.map((x) => x.inst)).size;
      if (colleges >= MIN_GROUP) out[cat] = Math.max(...c.map((x) => x.rank));
    }
    return { cut: out, colleges: new Set(mine.map((x) => x.inst)).size, seats: mine.length };
  };
  const aiq = fam("aiq");
  const deemed = fam("deemed");
  if (!Object.keys(aiq.cut).length && !Object.keys(deemed.cut).length) return null;
  return {
    year: live.year,
    label: live.spec.label,
    slug: live.spec.slug,
    final: live.final,
    aiq: aiq.cut,
    deemed: deemed.cut,
    aiqColleges: aiq.colleges,
    deemedColleges: deemed.colleges,
    aiqSeats: aiq.seats,
    deemedSeats: deemed.seats,
  };
}

export const getBranchState = (courseSlug: string, stateSlug: string) =>
  unstable_cache(() => load(courseSlug, stateSlug), ["branch-state-v3", courseSlug, stateSlug], {
    revalidate: DAY,
    tags: ["seat-data", "mcc"],
  })();
