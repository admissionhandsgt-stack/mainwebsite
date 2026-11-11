/**
 * MD/MS vs DNB (2026-11-11, the competitive review's "MD vs DNB" gap), from data we hold — nothing typed:
 *  - seats: MCC's seat matrix, MD/MS (All India Quota, deemed, central universities) beside DNB and NBE diploma, per
 *    branch and in all (lib/pgSeatData.ts; the two are never summed into one college count — the twin-entry rule);
 *  - the running counselling's latest MCC round: per branch, the last rank admitted on an AIQ MD/MS seat and on a DNB
 *    seat, each only over 3+ colleges (lib/mccResults.ts — the round pages' own figures), with the score each held;
 *  - stipend and fee: one figure per hospital (its most common), median and middle 80%, from the seat terms as listed
 *    for the counselling (pg_seat_terms — a compilation, never official; the page carries its caveat).
 * Server only.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { getLatestLiveRound } from "@/lib/mccResults";
import { getSeatMatrixOverview, type MatrixOverview } from "@/lib/pgSeatData";
import { getScoreTables } from "@/lib/scoreRank";
import { branchSlug } from "@/lib/branchSlug";

/** "MD Radio Diagnosis" and "DNB Radio-Diagnosis", "MS Orthopaedics" and "DNB Orthopedics" → one key. */
export const branchKey = (course: string) =>
  course
    .toLowerCase()
    .replace(/^(md|ms|m\.d\.|m\.s\.|dnb|drnb)\s*[-:]?\s*/, "")
    .replace(/\((.*?)\)/g, " $1 ")
    .replace(/ae/g, "e")
    .replace(/oe/g, "e")
    .replace(/\band\b|&/g, " ")
    .replace(/[^a-z]/g, "");

export interface BranchPair {
  branch: string;
  md: string;
  dnb: string;
  mdSlug: string;
  dnbSlug: string;
  mdSeats: number | null;
  dnbSeats: number | null;
  /** Last Open-category rank admitted in the round, AIQ MD/MS and DNB; null when fewer than 3 colleges. */
  mdLast: number | null;
  dnbLast: number | null;
  mdScore: number | null;
  dnbScore: number | null;
}

export interface TermsFamily {
  hospitals: number;
  y1: { median: number; p10: number; p90: number } | null;
  y3: number | null;
  fee: { median: number; p10: number; p90: number } | null;
}

export interface MdVsDnb {
  matrixYear: number | null;
  mdmsSeats: number;
  dnbSeats: number;
  mdmsColleges: number | null;
  dnbHospitals: number | null;
  round: { year: number; label: string; final: boolean } | null;
  outOf: number | null;
  pairs: BranchPair[];
  /** Of the branches with both figures, how many DNB's last Open rank went further down the list than MD/MS AIQ's. */
  deeper: number;
  compared: number;
  terms: { aiq: TermsFamily | null; dnb: TermsFamily | null; session: string | null };
}

const loadTerms = unstable_cache(
  async () => {
    const r = (await db.execute(sql`
      WITH per AS (
        SELECT institute_id,
               CASE WHEN degree ~* '^(DNB|Diploma \\(NBE\\))' OR seat_type ~* '^(DNB|NBE)' THEN 'dnb'
                    WHEN seat_type = 'AIQ' THEN 'aiq' END AS fam,
               mode() WITHIN GROUP (ORDER BY stipend_y1) FILTER (WHERE stipend_y1 > 0) AS s1,
               mode() WITHIN GROUP (ORDER BY stipend_y3) FILTER (WHERE stipend_y3 > 0) AS s3,
               mode() WITHIN GROUP (ORDER BY fee_inr) FILTER (WHERE fee_inr > 0) AS fee
          FROM pg_seat_terms
         GROUP BY 1, 2)
      SELECT fam,
             count(*) FILTER (WHERE s1 IS NOT NULL)::int AS n1,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY s1)::int AS y1,
             percentile_cont(0.1) WITHIN GROUP (ORDER BY s1)::int AS y1lo,
             percentile_cont(0.9) WITHIN GROUP (ORDER BY s1)::int AS y1hi,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY s3)::int AS y3,
             count(*) FILTER (WHERE fee IS NOT NULL)::int AS nf,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY fee)::int AS fee,
             percentile_cont(0.1) WITHIN GROUP (ORDER BY fee)::int AS feelo,
             percentile_cont(0.9) WITHIN GROUP (ORDER BY fee)::int AS feehi,
             count(*)::int AS hospitals
        FROM per WHERE fam IS NOT NULL GROUP BY fam`)) as unknown as {
      fam: "aiq" | "dnb";
      n1: number;
      y1: number | null;
      y1lo: number | null;
      y1hi: number | null;
      y3: number | null;
      nf: number;
      fee: number | null;
      feelo: number | null;
      feehi: number | null;
      hospitals: number;
    }[];
    const sess = (await db.execute(sql`SELECT mode() WITHIN GROUP (ORDER BY fee_session) AS s FROM pg_seat_terms`)) as unknown as { s: string | null }[];
    const fam = (k: "aiq" | "dnb"): TermsFamily | null => {
      const x = r.find((y) => y.fam === k);
      if (!x) return null;
      return {
        hospitals: x.hospitals,
        y1: x.n1 >= 3 && x.y1 ? { median: x.y1, p10: x.y1lo ?? x.y1, p90: x.y1hi ?? x.y1 } : null,
        y3: x.n1 >= 3 ? x.y3 : null,
        fee: x.nf >= 3 && x.fee ? { median: x.fee, p10: x.feelo ?? x.fee, p90: x.feehi ?? x.fee } : null,
      };
    };
    return { aiq: fam("aiq"), dnb: fam("dnb"), session: sess[0]?.s ?? null };
  },
  ["md-vs-dnb-terms-v1"],
  { revalidate: 86400, tags: ["seat-terms"] },
);

export async function getMdVsDnb(): Promise<MdVsDnb> {
  const [overview, live, terms, tables]: [MatrixOverview | null, Awaited<ReturnType<typeof getLatestLiveRound>>, Awaited<ReturnType<typeof loadTerms>>, Awaited<ReturnType<typeof getScoreTables>>] = await Promise.all([
    getSeatMatrixOverview().catch(() => null),
    getLatestLiveRound().catch(() => null),
    loadTerms().catch(() => ({ aiq: null, dnb: null, session: null })),
    getScoreTables("pg").catch(() => []),
  ]);
  const isDnb = (c: string) => /^(DNB|DrNB)\b/i.test(c);
  const isMdms = (c: string) => /^(MD|MS)\b/i.test(c);

  // Seats per branch from MCC's matrix: MD/MS rows (every MD/MS matrix) and DNB rows.
  const seats = new Map<string, { md?: string; dnb?: string; mdSeats: number; dnbSeats: number }>();
  for (const b of overview?.branches ?? []) {
    const k = branchKey(b.course);
    const e = seats.get(k) ?? { mdSeats: 0, dnbSeats: 0 };
    if (isDnb(b.course)) {
      e.dnb ??= b.course;
      e.dnbSeats += b.seats;
    } else if (isMdms(b.course)) {
      e.md ??= b.course;
      e.mdSeats += b.seats;
    }
    seats.set(k, e);
  }
  // The round's last ranks, by the same key.
  const mdCut = new Map<string, { course: string; open: number | null }>();
  const dnbCut = new Map<string, { course: string; open: number | null }>();
  for (const [course, cut] of live?.byCourse ?? []) if (isMdms(course)) mdCut.set(branchKey(course), { course, open: cut.Open ?? null });
  for (const [course, cut] of live?.byCourseDnb ?? []) if (isDnb(course)) dnbCut.set(branchKey(course), { course, open: cut.Open ?? null });

  const table = live ? tables.find((t) => t.year === live.year) ?? null : null;
  const scoreAt = (rank: number | null) => (rank == null || !table ? null : table.rows.find((r) => r.rankMin <= rank && rank <= r.rankMax)?.score ?? null);

  const pairs: BranchPair[] = [];
  for (const [k, e] of seats) {
    const md = e.md ?? mdCut.get(k)?.course;
    const dnb = e.dnb ?? dnbCut.get(k)?.course;
    if (!md || !dnb) continue;
    const mdLast = mdCut.get(k)?.open ?? null;
    const dnbLast = dnbCut.get(k)?.open ?? null;
    pairs.push({
      branch: md.replace(/^(MD|MS)\s+/i, ""),
      md,
      dnb,
      mdSlug: branchSlug(md),
      dnbSlug: branchSlug(dnb),
      mdSeats: e.mdSeats || null,
      dnbSeats: e.dnbSeats || null,
      mdLast,
      dnbLast,
      mdScore: scoreAt(mdLast),
      dnbScore: scoreAt(dnbLast),
    });
  }
  // Most competitive first by the MD/MS cut; branches without a cut at the end, by seats.
  pairs.sort((a, b) => (a.mdLast ?? Infinity) - (b.mdLast ?? Infinity) || (b.mdSeats ?? 0) - (a.mdSeats ?? 0));
  const both = pairs.filter((p) => p.mdLast != null && p.dnbLast != null);
  const matrix = (re: RegExp) => (overview?.byMatrix ?? []).filter((m) => re.test(m.seatMatrix));
  const dnbM = matrix(/dnb|nbe/i);
  const mdM = matrix(/^(?!.*(dnb|nbe)).*/i);
  return {
    matrixYear: overview?.year ?? null,
    mdmsSeats: mdM.reduce((a, m) => a + m.seats, 0),
    dnbSeats: dnbM.reduce((a, m) => a + m.seats, 0),
    mdmsColleges: null,
    dnbHospitals: dnbM.length === 1 ? dnbM[0].colleges : null,
    round: live ? { year: live.year, label: live.spec.label, final: live.final } : null,
    outOf: table?.outOf ?? null,
    pairs,
    deeper: both.filter((p) => p.dnbLast! > p.mdLast!).length,
    compared: both.length,
    terms,
  };
}
