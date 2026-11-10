import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/**
 * Clinical branches at a low NEET PG rank (2026-11-10; owner: "Low Score Clinical Branches… Just Eligible ko bhi badi
 * clinical branch jaise MD Medicine… sab cheej khullam khulla nhi likhni, candidate ko counselor par depend karana hai").
 *
 * From MCC's own results (`mcc_allotments`): for each clinical branch, the last rank admitted in a seat family — the All
 * India Quota's open category, deemed universities' paid seats (no category), and DNB's open category — in the last
 * complete counselling and the one running, with the score that rank held (NBEMS's `score_ranks`). Group figures only,
 * over three or more colleges (`groupRank`'s rule): never which college, never one college's rank. Which colleges, at
 * what fee and bond, in which round, is the counsellor's — the page says so.
 *
 * Server only.
 */
export type Family = "aiq" | "deemed" | "dnb";
export interface Cut {
  rank: number;
  colleges: number;
  score: number | null;
  outOf: number | null;
}
export interface ClinicalRow {
  branch: string;
  /** The MD/MS branch page, when there is one. */
  slug: string | null;
  cuts: Record<number, Partial<Record<Family, Cut>>>;
  /** Government seats in MCC's All India Quota, by allotted category (PwD lists left out). */
  aiqByCategory: Record<number, Partial<Record<Category, Cut>>>;
}
export type Category = "Open" | "EWS" | "OBC" | "SC" | "ST";
export const CATEGORIES: Category[] = ["Open", "EWS", "OBC", "SC", "ST"];
export interface LowRankClinical {
  years: number[];
  /** The newest year's latest round, e.g. "Round 1" (null when that year is complete). */
  runningRound: string | null;
  ranked: Record<number, number>;
  rows: ClinicalRow[];
  /** The score that held each milestone rank, per year (NBEMS). */
  milestones: Record<number, { rank: number; score: number | null; outOf: number | null }[]>;
}

/** The ranks people ask about: "50k rank in neet pg", "1 lakh rank". */
export const RANK_MILESTONES = [25_000, 50_000, 75_000, 1_00_000, 1_25_000, 1_50_000, 2_00_000];

/** The branches people mean by "clinical", in the order they are asked about; the pattern matches MD/MS and DNB names. */
export const CLINICAL: { branch: string; re: RegExp; slug: string }[] = [
  { branch: "General Medicine", re: /general medicine/i, slug: "md-general-medicine" },
  { branch: "General Surgery", re: /general surgery/i, slug: "ms-general-surgery" },
  { branch: "Orthopaedics", re: /orthop/i, slug: "ms-orthopaedics" },
  { branch: "Obstetrics & Gynaecology", re: /obstetric/i, slug: "ms-obstetrics-and-gynaecology" },
  { branch: "Paediatrics", re: /paediatric|pediatric/i, slug: "md-paediatrics" },
  { branch: "Radio Diagnosis", re: /radio ?-?diagnosis|radiology/i, slug: "md-radio-diagnosis" },
  { branch: "Dermatology", re: /dermatolog/i, slug: "md-dermatology-venereology-and-leprosy" },
  { branch: "ENT", re: /\bent\b|oto-?rhino/i, slug: "ms-ent" },
  { branch: "Ophthalmology", re: /ophthalm/i, slug: "ms-ophthalmology" },
  { branch: "Psychiatry", re: /psychiatr/i, slug: "md-psychiatry" },
  { branch: "Anaesthesiology", re: /anaesthes|anesthes/i, slug: "md-anaesthesiology" },
  { branch: "Respiratory Medicine", re: /respiratory|tuberculosis|pulmonary/i, slug: "md-tuberculosis-and-respiratory-diseases" },
  { branch: "Emergency Medicine", re: /emergency medicine/i, slug: "md-emergency-medicine" },
];

const MIN_COLLEGES = 3;

export const getLowRankClinical = unstable_cache(
  async (): Promise<LowRankClinical | null> => {
    const yrs = (await db.execute(sql`
      SELECT year, array_agg(DISTINCT round ORDER BY round) AS rounds FROM mcc_allotments GROUP BY year ORDER BY year DESC LIMIT 2
    `)) as unknown as { year: number; rounds: string[] }[];
    if (!yrs.length) return null;
    const years = yrs.map((y) => Number(y.year)).sort((a, b) => a - b);
    const newest = yrs[0];
    const complete = newest.rounds.some((r) => /stray|round 3/i.test(r));
    const runningRound = complete ? null : [...newest.rounds].filter((r) => /^Round \d/.test(r)).sort().pop() ?? null;

    // One row per course × family × year: the last rank admitted and how many colleges took it. Diplomas are left out.
    const rows = (await db.execute(sql`
      WITH a AS (
        SELECT m.year, c.name AS course, m.rank, m.institute_id,
               CASE WHEN m.quota = 'All India' THEN 'aiq'
                    WHEN m.quota ~* '^DNB' THEN 'dnb'
                    WHEN m.quota ~* 'self.?financed|paid|management' THEN 'deemed' END AS fam,
               CASE WHEN coalesce(m.allotted_category, '') ~* 'pwd|disab' THEN 'PwD'
                    WHEN m.allotted_category ~* '^ST\\M|tribe' THEN 'ST'
                    WHEN m.allotted_category ~* '^SC\\M|caste' THEN 'SC'
                    WHEN m.allotted_category ~* 'OBC|backward' THEN 'OBC'
                    WHEN m.allotted_category ~* 'EWS|economically' THEN 'EWS'
                    ELSE 'Open' END AS cat
          FROM mcc_allotments m JOIN courses c ON c.id = m.course_id
         WHERE m.year IN (${sql.join(years.map((y) => sql`${y}`), sql`, `)})
           AND m.rank IS NOT NULL
           AND (m.status IS NULL OR m.status !~* 'retain|not allotted')
           AND c.name !~* '^diploma'
      )
      SELECT year, course, fam, CASE WHEN fam = 'deemed' THEN 'any' ELSE cat END AS cat,
             count(DISTINCT institute_id)::int AS colleges, max(rank)::int AS last_rank
        FROM a
       WHERE fam IS NOT NULL AND cat <> 'PwD'
       GROUP BY 1, 2, 3, 4
    `)) as unknown as { year: number; course: string; fam: Family; cat: string; colleges: number; last_rank: number }[];

    const scores = (await db.execute(sql`
      SELECT year, score, score_out_of, rank_min, rank_max FROM score_ranks WHERE exam = 'pg' AND year IN (${sql.join(years.map((y) => sql`${y}`), sql`, `)})
    `)) as unknown as { year: number; score: number; score_out_of: number; rank_min: number; rank_max: number }[];
    const ranked: Record<number, number> = {};
    for (const s of scores) ranked[s.year] = Math.max(ranked[s.year] ?? 0, s.rank_max);
    const scoreAt = (year: number, rank: number) => {
      const s = scores.find((x) => Number(x.year) === year && rank >= x.rank_min && rank <= x.rank_max);
      return s ? { score: Number(s.score), outOf: Number(s.score_out_of) } : { score: null, outOf: null };
    };

    const out: ClinicalRow[] = CLINICAL.map((c) => ({ branch: c.branch, slug: c.slug, cuts: {}, aiqByCategory: {} }));
    for (const r of rows) {
      const i = CLINICAL.findIndex((c) => c.re.test(r.course));
      if (i < 0 || r.colleges < MIN_COLLEGES) continue;
      // MD/MS rows count for AIQ and deemed; DNB rows only for DNB (a DNB course in another family is MCC's naming noise).
      const isDnbCourse = /^dnb|nbe/i.test(r.course);
      if ((r.fam === "dnb") !== isDnbCourse) continue;
      const year = Number(r.year);
      const cut = { rank: Number(r.last_rank), colleges: Number(r.colleges), ...scoreAt(year, Number(r.last_rank)) };
      if (r.fam === "aiq") {
        const byCat = (out[i].aiqByCategory[year] ??= {});
        const c = r.cat as Category;
        if (CATEGORIES.includes(c) && (!byCat[c] || cut.rank > byCat[c]!.rank)) byCat[c] = cut;
      }
      if (r.fam !== "deemed" && r.cat !== "Open") continue;
      const cell = (out[i].cuts[year] ??= {});
      const prev = cell[r.fam];
      if (!prev || cut.rank > prev.rank) cell[r.fam] = cut;
    }
    const milestones: LowRankClinical["milestones"] = {};
    for (const y of years) milestones[y] = RANK_MILESTONES.filter((m) => m <= (ranked[y] ?? 0)).map((m) => ({ rank: m, ...scoreAt(y, m) }));
    return { years, runningRound, ranked, rows: out.filter((r) => Object.keys(r.cuts).length), milestones };
  },
  ["low-rank-clinical-v3"],
  { revalidate: 3600, tags: ["mcc"] },
);
