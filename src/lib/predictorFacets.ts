/**
 * The filter options the NEET College Predictor offers, read from the data.
 *
 * One tool covers every stream, because the question is identical in all of
 * them — "what does my rank reach" — and only the course changes. A stream is
 * therefore a `level` plus, for the undergraduate ones, a single course:
 *
 *   mbbs -> level ug, course MBBS
 *   bds  -> level ug, course BDS
 *   pg   -> level pg, every course, and a Branch filter appears
 *
 * Nothing here is a hardcoded list. A re-import that adds a branch, a state or
 * a category scheme shows up in the filters without a deploy — and an option
 * never appears that would return nothing.
 *
 * The categories genuinely differ: UG publishes UR, PG publishes GEN. Loading
 * facets per stream is what stops the tool offering a category the chosen
 * course has no seats for.
 */

import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";
import { logError } from "@/lib/logger";

export type Stream = "mbbs" | "bds" | "pg";

export interface StreamSpec {
  id: Stream;
  /** What the tab says. */
  label: string;
  /** The longer name, for headings and metadata. */
  full: string;
  level: "ug" | "pg";
  /** Constrain to one course, or null to allow every course at that level. */
  course: string | null;
  /** Whether a Branch filter is worth showing. */
  hasBranches: boolean;
}

export const STREAMS: StreamSpec[] = [
  { id: "mbbs", label: "MBBS", full: "MBBS", level: "ug", course: "MBBS", hasBranches: false },
  { id: "bds", label: "BDS", full: "BDS (Dental)", level: "ug", course: "BDS", hasBranches: false },
  { id: "pg", label: "MD / MS", full: "MD, MS, DNB & Diploma", level: "pg", course: null, hasBranches: true },
];

export function streamSpec(id: string | null | undefined): StreamSpec {
  return STREAMS.find((s) => s.id === id) ?? STREAMS[0];
}

export interface CategoryFacet {
  code: string;
  /** How many seats carry it, so a chip can say how much it covers. */
  seats: number;
}

/**
 * NRI and management are **quotas**, not categories.
 *
 * The chips only ever offered categories, so a candidate looking for an NRI
 * seat found no NRI anywhere and concluded we did not have the data. We hold
 * 1,400+ of them: 771 under a plain `NRI` quota plus the state variants
 * (Telangana MQ2 C-Cat-NRI, AP S2 C-Cat-NRI, Maharashtra, Karnataka, TN).
 *
 * The source mixes the two dimensions — some states publish NRI as a category
 * (`NRI-Priority II`), most as a quota — which is also why `MNG` turns up
 * among the category chips. Rather than pretend one is the other, the tool now
 * has a seat-type control that filters on the quota and says so.
 */
export type SeatTypeId = "all" | "nri" | "management";

export interface SeatTypeFacet {
  id: SeatTypeId;
  label: string;
  seats: number;
}

export interface Facets {
  states: string[];
  categories: CategoryFacet[];
  /** Course names, commonest first. Empty for the single-course streams. */
  branches: string[];
  ownerships: string[];
  seatTypes: SeatTypeFacet[];
  years: number[];
}

const EMPTY: Facets = {
  states: [],
  categories: [],
  branches: [],
  ownerships: [],
  seatTypes: [],
  years: [],
};

const rows = <T,>(r: unknown) => r as unknown as T[];

async function load(id: Stream): Promise<Facets> {
  const spec = streamSpec(id);
  const courseFilter = spec.course ? sql`AND c.name ILIKE ${spec.course}` : sql``;

  try {
    const [states, cats, branches, owners, years, seatTypes] = await Promise.all([
      db.execute(sql`
        SELECT DISTINCT st.name
        FROM seat_options so
        JOIN institutes i ON i.id = so.institute_id
        JOIN states st ON st.id = i.state_id
        JOIN courses c ON c.id = so.course_id
        WHERE so.level = ${spec.level} ${courseFilter}
        ORDER BY st.name
      `),
      db.execute(sql`
        SELECT cat.code, COUNT(*)::int AS n
        FROM seat_options so
        JOIN categories cat ON cat.id = so.category_id
        JOIN courses c ON c.id = so.course_id
        WHERE so.level = ${spec.level} ${courseFilter}
        GROUP BY cat.code ORDER BY n DESC LIMIT 14
      `),
      // Ordered by how many seats carry them, so the branches a candidate is
      // most likely to want sit at the top of a hundred-item list.
      spec.hasBranches
        ? db.execute(sql`
            SELECT c.name, COUNT(*)::int AS n
            FROM seat_options so
            JOIN courses c ON c.id = so.course_id
            WHERE so.level = ${spec.level}
            GROUP BY c.name ORDER BY n DESC
          `)
        : Promise.resolve([]),
      db.execute(sql`
        SELECT DISTINCT i.ownership::text AS name
        FROM seat_options so
        JOIN institutes i ON i.id = so.institute_id
        JOIN courses c ON c.id = so.course_id
        WHERE so.level = ${spec.level} ${courseFilter}
          AND i.ownership IS NOT NULL AND i.ownership::text <> 'other'
        ORDER BY name
      `),
      db.execute(sql`
        SELECT DISTINCT year FROM closing_ranks WHERE level = ${spec.level} ORDER BY year
      `),
      // Drawn the same conservative way as the quota pages: a seat counts only
      // when its own label says so. "Karnataka Private Seats - GMP Quota" is a
      // government-merit seat inside a private college and is neither.
      db.execute(sql`
        SELECT
          COUNT(*) FILTER (WHERE q.label ILIKE '%NRI%')::int AS nri,
          COUNT(*) FILTER (
            WHERE (q.label ILIKE '%management%' OR q.label = 'MNG')
              AND q.label NOT ILIKE '%NRI%'
          )::int AS management,
          COUNT(*)::int AS all_seats
        FROM seat_options so
        JOIN quotas q ON q.id = so.quota_id
        JOIN courses c ON c.id = so.course_id
        WHERE so.level = ${spec.level} ${courseFilter}
      `),
    ]);

    const q = rows<{ nri: number; management: number; all_seats: number }>(seatTypes)[0];

    return {
      states: rows<{ name: string }>(states).map((r) => r.name),
      categories: rows<{ code: string; n: number }>(cats).map((r) => ({
        code: r.code,
        seats: r.n,
      })),
      branches: rows<{ name: string }>(branches).map((r) => r.name),
      ownerships: rows<{ name: string }>(owners).map((r) => r.name),
      seatTypes: [
        { id: "all" as const, label: "All seats", seats: q?.all_seats ?? 0 },
        { id: "nri" as const, label: "NRI quota", seats: q?.nri ?? 0 },
        { id: "management" as const, label: "Management quota", seats: q?.management ?? 0 },
        // A type with no seats at this level is not offered — an empty filter
        // is how the UG predictor used to open on a category with no rows.
      ].filter((t) => t.id === "all" || t.seats > 0),
      years: rows<{ year: number }>(years).map((r) => r.year),
    };
  } catch (error) {
    // The rank box is the only required input, so a database hiccup degrades
    // the filters rather than the page.
    logError(error, { route: `predictorFacets:${id}` });
    return EMPTY;
  }
}

const cached: Record<Stream, () => Promise<Facets>> = {
  mbbs: unstable_cache(() => load("mbbs"), ["facets-mbbs"], { revalidate: 86400, tags: ["closing-ranks"] }),
  bds: unstable_cache(() => load("bds"), ["facets-bds"], { revalidate: 86400, tags: ["closing-ranks"] }),
  pg: unstable_cache(() => load("pg"), ["facets-pg"], { revalidate: 86400, tags: ["closing-ranks"] }),
};

export async function getPredictorFacets(id: Stream): Promise<Facets> {
  return cached[id]();
}

/** Every stream's facets, so the tool can switch without a round trip. */
export async function getAllFacets(): Promise<Record<Stream, Facets>> {
  const [mbbs, bds, pg] = await Promise.all([
    getPredictorFacets("mbbs"),
    getPredictorFacets("bds"),
    getPredictorFacets("pg"),
  ]);
  return { mbbs, bds, pg };
}

/** "2024–25" from [2024, 2025]. */
export function yearSpan(years: number[]): string {
  if (!years.length) return "";
  if (years.length === 1) return String(years[0]);
  return `${years[0]}–${String(years[years.length - 1]).slice(2)}`;
}
