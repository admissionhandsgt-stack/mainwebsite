/**
 * The public cutoff answer for a college page: general category, merit quotas,
 * as a band (lib/chance.ts) — never a rank. No server imports, so it can be
 * used anywhere; the rows come from getCollegeCutoffs.
 */

import type { CourseCutoff } from "@/lib/collegeQueries";
import { GENERAL_CODES, isMeritQuota, rankBand } from "@/lib/chance";
import { categoryKey } from "@/lib/categoryScope";

/**
 * The reserved categories a college page shows as bands too (owner, 2026-11-05) — EWS, OBC, SC and ST, matched by
 * the authority's own code only: the national spelling, and Gujarat's government-quota "GQ-" form of the same list.
 * A state's own groups (Karnataka 2A, Telangana BC-B, Gujarat's SEBC, sub-categorised SC lists) are not folded into
 * OBC or SC — a central-list candidate is not on them. PwD, NRI and management stay with the chance view.
 */
export const BAND_CATEGORIES = ["EWS", "OBC", "SC", "ST"] as const;
export type BandCategory = (typeof BAND_CATEGORIES)[number];
const FAMILY = new Map<string, BandCategory>(
  BAND_CATEGORIES.flatMap((c) => [[categoryKey(c), c] as [string, BandCategory]]).concat([
    [categoryKey("GQ-EW"), "EWS"],
    [categoryKey("GQ-SC"), "SC"],
    [categoryKey("GQ-ST"), "ST"],
  ]),
);

export interface BandRow {
  course: string;
  quota: string;
  band: string;
  year: number | null;
  /** Year on year, in words only: was the last seat taken at a later rank, an earlier one, or about the same? */
  trend: "easier" | "tighter" | "steady" | null;
  seats: number | null;
  /** The same course and quota in the same year, per reserved category — a band each, never a rank. */
  byCategory: Partial<Record<BandCategory, string>>;
}

const trendOf = (latest: number | null, previous: number | null): BandRow["trend"] => {
  if (!latest || !previous) return null;
  const d = (latest - previous) / previous;
  if (Math.abs(d) < 0.1) return "steady";
  // A larger closing rank means the cut reached further down the list.
  return d > 0 ? "easier" : "tighter";
};

const allIndia = (q: string) => /all india|aiq/i.test(q);

/**
 * One band per (course, merit quota), general category only. All India first,
 * then the quotas with the most seats; capped so a PG college with forty
 * branches lists what people search for rather than everything.
 */
export function generalBands(cutoffs: CourseCutoff[], max = 12): BandRow[] {
  const best = new Map<string, CourseCutoff>();
  // course | quota | category -> the seat, for the reserved columns (more seats wins, as for general).
  const reserved = new Map<string, CourseCutoff>();
  for (const c of cutoffs) {
    const fam = FAMILY.get(categoryKey(c.category));
    if (!fam || !isMeritQuota(c.quota) || !(c.widestLatest ?? c.r1Latest)) continue;
    const key = `${c.course}|${c.quota}|${fam}`;
    const prev = reserved.get(key);
    if (!prev || (c.seats ?? 0) > (prev.seats ?? 0)) reserved.set(key, c);
  }
  for (const c of cutoffs) {
    if (!GENERAL_CODES.has(c.category) || !isMeritQuota(c.quota)) continue;
    const reach = c.widestLatest ?? c.r1Latest;
    if (!reach) continue;
    const key = `${c.course}|${c.quota}`;
    const prev = best.get(key);
    // Two general codes on one quota (rare): keep the one with more seats.
    if (!prev || (c.seats ?? 0) > (prev.seats ?? 0)) best.set(key, c);
  }
  return [...best.values()]
    .sort(
      (a, b) =>
        Number(allIndia(b.quota)) - Number(allIndia(a.quota)) ||
        (b.seats ?? 0) - (a.seats ?? 0) ||
        a.course.localeCompare(b.course),
    )
    .slice(0, max)
    .map((c) => ({
      course: c.course,
      quota: c.quota,
      band: rankBand(c.widestLatest ?? c.r1Latest)!,
      year: c.latestYear,
      trend: trendOf(c.widestLatest, c.widestPrevious),
      seats: c.seats,
      byCategory: Object.fromEntries(
        BAND_CATEGORIES.flatMap((fam) => {
          const r = reserved.get(`${c.course}|${c.quota}|${fam}`);
          // Only the general row's own year: seat_options keeps each seat's latest year, which can differ.
          if (!r || r.latestYear !== c.latestYear) return [];
          const band = rankBand(r.widestLatest ?? r.r1Latest);
          return band ? [[fam, band]] : [];
        }),
      ) as BandRow["byCategory"],
    }));
}

export const TREND_LABEL: Record<NonNullable<BandRow["trend"]>, string> = {
  easier: "Easier than last year",
  tighter: "Tighter than last year",
  steady: "About the same",
};
