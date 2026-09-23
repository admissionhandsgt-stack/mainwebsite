/**
 * What we actually hold, counted from the database.
 *
 * The site was quoting "250+ PG colleges", "60+ branches" and "5-year cutoff
 * intelligence" in hardcoded strings. The real figures are 2,168 colleges and
 * 101 branches — so the marketing was underselling the product by nearly nine
 * times — while the one number it inflated, the years of data, is the one
 * thing we cannot back: PG covers 2024–2025 and UG covers 2025–2026.
 *
 * Numbers that describe the data now come from the data. A stat that drifts
 * from what the database says is worse than no stat, because the first student
 * who counts is the one deciding whether to trust us.
 *
 * Claims about *outcomes* — students guided, years in the business — are not
 * here. Those are the team's to state and cannot be derived; they just must
 * not be invented either.
 */

import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

export interface DataStats {
  pgColleges: number;
  ugColleges: number;
  /** MBBS-teaching colleges, the number the UG directory shows. */
  ugMbbsColleges: number;
  pgRanks: number;
  ugRanks: number;
  totalRanks: number;
  seatOptions: number;
  pgBranches: number;
  states: number;
  pgYears: number[];
  ugYears: number[];
}

/** What to show when the database cannot be reached: nothing invented. */
const EMPTY: DataStats = {
  pgColleges: 0,
  ugColleges: 0,
  ugMbbsColleges: 0,
  pgRanks: 0,
  ugRanks: 0,
  totalRanks: 0,
  seatOptions: 0,
  pgBranches: 0,
  states: 0,
  pgYears: [],
  ugYears: [],
};

const n = (r: unknown) => (r as unknown as { n: number }[])[0]?.n ?? 0;

async function load(): Promise<DataStats> {
  try {
    const [pgC, ugC, ugM, pgR, ugR, seats, branches, states, pgY, ugY] = await Promise.all([
      db.execute(sql`SELECT count(*)::int AS n FROM institutes WHERE level = 'pg'`),
      db.execute(sql`SELECT count(*)::int AS n FROM institutes WHERE level = 'ug'`),
      db.execute(sql`
        SELECT count(DISTINCT cr.institute_id)::int AS n
        FROM closing_ranks cr JOIN courses c ON c.id = cr.course_id
        WHERE cr.level = 'ug' AND c.name ILIKE 'MBBS'
      `),
      db.execute(sql`SELECT count(*)::int AS n FROM closing_ranks WHERE level = 'pg'`),
      db.execute(sql`SELECT count(*)::int AS n FROM closing_ranks WHERE level = 'ug'`),
      db.execute(sql`SELECT count(*)::int AS n FROM seat_options`),
      db.execute(sql`SELECT count(DISTINCT course_id)::int AS n FROM closing_ranks WHERE level = 'pg'`),
      db.execute(sql`
        SELECT count(DISTINCT st.id)::int AS n
        FROM institutes i JOIN states st ON st.id = i.state_id
      `),
      db.execute(sql`SELECT DISTINCT year FROM closing_ranks WHERE level = 'pg' ORDER BY year`),
      db.execute(sql`SELECT DISTINCT year FROM closing_ranks WHERE level = 'ug' ORDER BY year`),
    ]);

    const pgRanks = n(pgR);
    const ugRanks = n(ugR);

    return {
      pgColleges: n(pgC),
      ugColleges: n(ugC),
      ugMbbsColleges: n(ugM),
      pgRanks,
      ugRanks,
      totalRanks: pgRanks + ugRanks,
      seatOptions: n(seats),
      pgBranches: n(branches),
      states: n(states),
      pgYears: (pgY as unknown as { year: number }[]).map((r) => r.year),
      ugYears: (ugY as unknown as { year: number }[]).map((r) => r.year),
    };
  } catch (error) {
    // A stat is a claim. If we cannot count it, we say nothing rather than
    // guessing — every consumer treats 0 as "leave this out".
    console.error("[dataStats]", error);
    return EMPTY;
  }
}

/**
 * Cached for a day: these only move when an import runs, and they are read on
 * almost every page.
 */
const cached = unstable_cache(load, ["data-stats"], {
  revalidate: 86400,
  tags: ["closing-ranks", "ug-colleges"],
});

export async function getDataStats(): Promise<DataStats> {
  return cached();
}

/* ----------------------------- formatting ----------------------------- */

export const inr = (v: number) => v.toLocaleString("en-IN");

/**
 * "2024–25" from [2024, 2025]; "2025" from one year.
 *
 * Written as a span rather than a count, because "2 years of data" sounds
 * thin while "2024–25" is simply what it is — and it is the two years that
 * decide this season's counselling.
 */
export function yearSpan(years: number[]): string {
  if (years.length === 0) return "";
  if (years.length === 1) return String(years[0]);
  const first = years[0];
  const last = years[years.length - 1];
  return `${first}–${String(last).slice(2)}`;
}

/** A rounded figure for prose, e.g. 230484 -> "2.3 lakh". */
export function approxLakh(v: number): string {
  if (v < 100000) return inr(v);
  return `${(v / 100000).toFixed(1).replace(/\.0$/, "")} lakh`;
}
