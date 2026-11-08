/**
 * A PG college's cutoff in the counselling year in progress (2026-11-09): MCC's own allotment results
 * (`mcc_allotments`, read off MCC's PDFs as each round is published), as bands — the same rule as the
 * page's other bands (lib/cutoffBands.ts): general category and EWS, OBC, SC and ST beside it, merit
 * quotas only, never the rank itself.
 *
 * Why: the PG college pages said "Cut Off 2025" through the 2026 counselling while families searched
 * "<college> cut off 2026"; the round pages had the year's figures but only per branch, never per college.
 *
 * The band is the last rank admitted so far this year — round 1 alone until round 2 is out, then the
 * widest across the rounds published — so the label always names the rounds it covers.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { GENERAL_CODES, isMeritQuota, rankBand } from "@/lib/chance";
import { BAND_CATEGORIES, type BandCategory, type BandRow } from "@/lib/cutoffBands";
import type { CourseCutoff } from "@/lib/collegeQueries";
import { shortCategory } from "@/lib/mccRoundTypes";

export interface LiveBands {
  year: number;
  /** MCC's round names covered, in counselling order ("Round 1", "Round 2"…). */
  rounds: string[];
  /** "round 1", "rounds 1–2", "rounds 1–3 and the stray vacancy round" — for headings and snippets. */
  label: string;
  rows: BandRow[];
}

const ROUND_ORDER = ["Round 1", "Round 2", "Round 3", "Stray Vacancy Round", "Special Stray Vacancy Round"];
const order = (r: string) => {
  const i = ROUND_ORDER.indexOf(r);
  return i < 0 ? 99 : i;
};

export function roundsLabel(rounds: string[]): string {
  const numbered = rounds.filter((r) => /^Round \d$/.test(r)).map((r) => r.slice(6));
  const stray = rounds.filter((r) => !/^Round \d$/.test(r)).map((r) => r.toLowerCase());
  const n = numbered.length === 0 ? "" : numbered.length === 1 ? `round ${numbered[0]}` : `rounds ${numbered[0]}–${numbered[numbered.length - 1]}`;
  return [n, ...stray.map((s) => `the ${s}`)].filter(Boolean).join(" and ");
}

/** MCC's quota names as a reader knows them. */
const QUOTA_LABEL: Record<string, string> = {
  "All India": "All India Quota",
  "Self-Financed Merit Seat": "Deemed (paid seat)",
};
const quotaOrder = (q: string) => (q === "All India" ? 0 : /^DNB/i.test(q) ? 1 : /self.?financed/i.test(q) ? 2 : 3);

interface Raw {
  year: number;
  round: string;
  course: string;
  quota: string;
  cat: string;
  last: number;
  n: number;
}

const load = unstable_cache(
  async (slug: string): Promise<Raw[]> =>
    (await db.execute(sql`
      SELECT a.year, a.round, COALESCE(c.name, a.mcc_course) AS course, a.quota, a.allotted_category AS cat,
             MAX(a.rank)::int AS last, COUNT(*)::int AS n
        FROM mcc_allotments a
        JOIN institutes i ON i.id = a.institute_id
        LEFT JOIN courses c ON c.id = a.course_id
       WHERE i.slug = ${slug} AND i.level = 'pg' AND a.rank IS NOT NULL
         AND a.year = (SELECT MAX(year) FROM mcc_allotments)
       GROUP BY 1, 2, 3, 4, 5
    `)) as unknown as Raw[],
  ["college-live-bands-v1"],
  { revalidate: 3600, tags: ["mcc", "seat-data"] },
);

/**
 * The college's bands for MCC's latest counselling year, or null when MCC has allotted nothing here
 * that year. `previous` is the page's own closing ranks, for the trend against last year's same round.
 */
export async function getCollegeLiveBands(slug: string, previous: CourseCutoff[] = []): Promise<LiveBands | null> {
  const raw = await load(slug).catch((): Raw[] => []);
  if (!raw.length) return null;
  const year = Number(raw[0].year);
  const rounds = [...new Set(raw.map((r) => r.round))].sort((a, b) => order(a) - order(b));

  // course | quota -> category -> the widest rank admitted so far this year, and how many were admitted.
  const cells = new Map<string, { course: string; quota: string; n: number; last: Partial<Record<"Open" | BandCategory, number>> }>();
  for (const r of raw) {
    // A deemed university's "Self-Financed Merit Seat" is its paid seat: like the management and paid quotas in the
    // page's own bands (isMeritQuota), it stays with the chance view, not a public band.
    if (!isMeritQuota(r.quota) || /self.?financed/i.test(r.quota)) continue;
    const cat = shortCategory(r.cat);
    if (cat !== "Open" && !(BAND_CATEGORIES as readonly string[]).includes(cat ?? "")) continue;
    const key = `${r.course}|${r.quota}`;
    const cell = cells.get(key) ?? { course: r.course, quota: r.quota, n: 0, last: {} };
    cell.n += Number(r.n);
    const k = cat as "Open" | BandCategory;
    cell.last[k] = Math.max(cell.last[k] ?? 0, Number(r.last));
    cells.set(key, cell);
  }

  // Last year's same seat, round 1 against round 1 while only round 1 is out; the widest otherwise.
  const r1Only = rounds.length === 1 && rounds[0] === "Round 1";
  const family = (q: string) => (q === "All India" ? /all india|aiq/i : /^DNB/i.test(q) ? /dnb/i : /self.?financed/i.test(q) ? /self.?financed|paid|management/i : null);
  const lastYear = (course: string, quota: string): number | null => {
    const re = family(quota);
    if (!re) return null;
    const hit = previous.find((c) => c.course === course && re.test(c.quota) && GENERAL_CODES.has(c.category));
    return hit ? (r1Only ? hit.r1Latest : hit.widestLatest) : null;
  };

  const rows: BandRow[] = [...cells.values()]
    .filter((c) => c.last.Open)
    .sort((a, b) => quotaOrder(a.quota) - quotaOrder(b.quota) || b.n - a.n || a.course.localeCompare(b.course))
    .map((c) => {
      const prev = lastYear(c.course, c.quota);
      const d = prev ? (c.last.Open! - prev) / prev : null;
      return {
        course: c.course,
        quota: QUOTA_LABEL[c.quota] ?? c.quota,
        band: rankBand(c.last.Open)!,
        year,
        trend: d == null ? null : Math.abs(d) < 0.1 ? "steady" : d > 0 ? "easier" : "tighter",
        seats: c.n,
        byCategory: Object.fromEntries(
          BAND_CATEGORIES.flatMap((cat) => {
            const band = rankBand(c.last[cat]);
            return band ? [[cat, band]] : [];
          }),
        ) as BandRow["byCategory"],
      };
    });
  if (!rows.length) return null;
  return { year, rounds, label: roundsLabel(rounds), rows };
}
