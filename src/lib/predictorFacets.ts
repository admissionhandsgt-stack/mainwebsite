/**
 * The filter options SeatPredict offers, read from the data.
 *
 * Nothing here is a hardcoded list. A re-import that adds a branch, a state or
 * a category scheme shows up in the filters without a deploy — and, more
 * importantly, an option never appears that would return nothing.
 *
 * Both levels share this, because the only difference between UG and PG here
 * is the `level` filter and which courses come back.
 */

import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { logError } from "@/lib/logger";

export type Level = "ug" | "pg";

export interface Facets {
  states: string[];
  categories: string[];
  /** Course names, commonest first — MD Radiodiagnosis before MD Aerospace. */
  branches: string[];
  ownerships: string[];
  seatCount: number;
  rankCount: number;
  collegeCount: number;
  years: number[];
}

const EMPTY: Facets = {
  states: [],
  categories: [],
  branches: [],
  ownerships: [],
  seatCount: 0,
  rankCount: 0,
  collegeCount: 0,
  years: [],
};

const rows = <T,>(r: unknown) => r as unknown as T[];
const one = (r: unknown) => rows<{ n: number }>(r)[0]?.n ?? 0;

async function load(level: Level): Promise<Facets> {
  try {
    const [states, cats, branches, owners, seats, ranks, colleges, years] = await Promise.all([
      db.execute(sql`
        SELECT DISTINCT st.name
        FROM seat_options so
        JOIN institutes i ON i.id = so.institute_id
        JOIN states st ON st.id = i.state_id
        WHERE so.level = ${level}
        ORDER BY st.name
      `),
      db.execute(sql`
        SELECT cat.code, COUNT(*)::int AS n
        FROM seat_options so
        JOIN categories cat ON cat.id = so.category_id
        WHERE so.level = ${level}
        GROUP BY cat.code ORDER BY n DESC LIMIT 14
      `),
      // Ordered by how many seats carry them, so the branches a candidate is
      // most likely to want are at the top of a long list.
      db.execute(sql`
        SELECT c.name, COUNT(*)::int AS n
        FROM seat_options so
        JOIN courses c ON c.id = so.course_id
        WHERE so.level = ${level}
        GROUP BY c.name ORDER BY n DESC
      `),
      db.execute(sql`
        SELECT DISTINCT i.ownership::text AS name
        FROM seat_options so
        JOIN institutes i ON i.id = so.institute_id
        WHERE so.level = ${level} AND i.ownership IS NOT NULL AND i.ownership::text <> 'other'
        ORDER BY name
      `),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM seat_options WHERE level = ${level}`),
      db.execute(sql`SELECT COUNT(*)::int AS n FROM closing_ranks WHERE level = ${level}`),
      db.execute(sql`
        SELECT COUNT(DISTINCT institute_id)::int AS n FROM seat_options WHERE level = ${level}
      `),
      db.execute(sql`
        SELECT DISTINCT year FROM closing_ranks WHERE level = ${level} ORDER BY year
      `),
    ]);

    return {
      states: rows<{ name: string }>(states).map((r) => r.name),
      categories: rows<{ code: string }>(cats).map((r) => r.code),
      branches: rows<{ name: string }>(branches).map((r) => r.name),
      ownerships: rows<{ name: string }>(owners).map((r) => r.name),
      seatCount: one(seats),
      rankCount: one(ranks),
      collegeCount: one(colleges),
      years: rows<{ year: number }>(years).map((r) => r.year),
    };
  } catch (error) {
    // The rank box is the only required input, so a database hiccup degrades
    // the filters rather than the page.
    logError(error, { route: `predictorFacets:${level}` });
    return EMPTY;
  }
}

const cachedUg = unstable_cache(() => load("ug"), ["predictor-facets-ug"], {
  revalidate: 86400,
  tags: ["closing-ranks"],
});
const cachedPg = unstable_cache(() => load("pg"), ["predictor-facets-pg"], {
  revalidate: 86400,
  tags: ["closing-ranks"],
});

export async function getPredictorFacets(level: Level): Promise<Facets> {
  return level === "ug" ? cachedUg() : cachedPg();
}

/** "2024–25" from [2024, 2025]. */
export function yearSpan(years: number[]): string {
  if (!years.length) return "";
  if (years.length === 1) return String(years[0]);
  return `${years[0]}–${String(years[years.length - 1]).slice(2)}`;
}
