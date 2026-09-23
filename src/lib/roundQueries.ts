/**
 * What happens to a seat after round 1.
 *
 * Every other tool stops at "what does my rank reach", which is a round-1
 * question. The decision that actually costs people a year comes next: you
 * hold a seat, and you have to choose whether to float for something better or
 * freeze what you have. That choice is answerable from round-by-round data,
 * and this file is the query layer for it.
 *
 * Two things the data says, and one it does not:
 *
 *   It says which seats were out of reach in round 1 and came within reach
 *   later — the upside of floating, counted rather than promised.
 *
 *   It says which seats went the *other* way: reachable in round 1, then
 *   closing at better ranks afterwards. 508 UG and 2,795 PG seats did that.
 *   Nobody shows this, and it is the whole risk.
 *
 *   It does not say what will happen this year. Every number here is what
 *   already happened, per year, as published.
 */

import { unstable_cache } from "next/cache";
import { db } from "@/db/client";
import { sql } from "drizzle-orm";

const rows = <T,>(r: unknown) => r as unknown as T[];

export type Level = "ug" | "pg";

export interface RoundMove {
  institute: string;
  instituteSlug: string;
  state: string | null;
  course: string;
  quota: string;
  category: string;
  counselling: string | null;
  year: number;
  /** Where round 1 closed. */
  r1: number | null;
  /** The furthest a round after round 1 reached, and which round that was. */
  laterRound: string | null;
  later: number | null;
  /** How far the cut travelled after round 1. Positive means it opened up. */
  movement: number | null;
}

export interface RoundSummary {
  /** Seats out of reach in round 1 that a later round reached. */
  opened: RoundMove[];
  /** Seats reachable in round 1 whose later rounds closed tighter. */
  tightened: RoundMove[];
  openedTotal: number;
  tightenedTotal: number;
  /** Every year the data covers, newest first. */
  years: number[];
}

/**
 * One row per seat per year, with round 1 and the widest the cut reached.
 *
 * `MAX(closing_rank)` is the widest because a bigger rank number means the cut
 * went further down the list. Round 1 is singled out because it is the only
 * round whose meaning is unambiguous — see the note on `seat_options`.
 */
const perSeat = (level: Level) => sql`
  SELECT
    cr.institute_id, cr.course_id, cr.quota_id, cr.category_id,
    cr.counselling_id, cr.year,
    MAX(cr.closing_rank) FILTER (WHERE cr.round_label = 'R1') AS r1,
    -- Later rounds only. Including round 1 in this would make it impossible
    -- for a seat to read as "tightened", because the maximum would always be
    -- at least round 1's own number.
    MAX(cr.closing_rank) FILTER (WHERE cr.round_label <> 'R1') AS later,
    (array_agg(cr.round_label ORDER BY cr.closing_rank DESC)
       FILTER (WHERE cr.round_label <> 'R1'))[1] AS later_round,
    COUNT(DISTINCT cr.round_label)::int AS rounds
  FROM closing_ranks cr
  WHERE cr.level = ${level} AND cr.closing_rank IS NOT NULL
  GROUP BY 1, 2, 3, 4, 5, 6
`;

const LABELLED = sql`
  i.name AS institute, i.slug AS institute_slug, st.name AS state,
  c.name AS course, q.code AS quota, cat.code AS category, cn.name AS counselling
`;

const JOINS = sql`
  JOIN institutes i ON i.id = p.institute_id
  LEFT JOIN states st ON st.id = i.state_id
  JOIN courses c ON c.id = p.course_id
  JOIN quotas q ON q.id = p.quota_id
  JOIN categories cat ON cat.id = p.category_id
  LEFT JOIN counsellings cn ON cn.id = p.counselling_id
`;

const toMove = (r: Record<string, unknown>): RoundMove => ({
  institute: r.institute as string,
  instituteSlug: r.institute_slug as string,
  state: (r.state as string) ?? null,
  course: r.course as string,
  quota: r.quota as string,
  category: r.category as string,
  counselling: (r.counselling as string) ?? null,
  year: r.year as number,
  r1: (r.r1 as number) ?? null,
  later: (r.later as number) ?? null,
  laterRound: (r.later_round as string) ?? null,
  movement: r.r1 != null && r.later != null ? (r.later as number) - (r.r1 as number) : null,
});

/**
 * What round 1 did not give you, and what came after it.
 *
 * `category` is matched exactly because a category code is an identity, not a
 * description — GEN and UR are different schemes, not synonyms.
 */
const loadRoundMoves = unstable_cache(
  _getRoundMoves,
  ["round-moves"],
  { revalidate: 3600, tags: ["closing-ranks"] },
);

/**
 * Cached for an hour, keyed by the arguments.
 *
 * The aggregate groups 274,483 closing ranks by seat, which takes seconds
 * through the tunnel. The answer only changes when an import runs, so paying
 * that on every request would be waste.
 */
export async function getRoundMoves(opts: {
  level: Level;
  rank: number;
  category: string;
  states?: string[];
  limit?: number;
}): Promise<RoundSummary> {
  return loadRoundMoves(opts);
}

async function _getRoundMoves(opts: {
  level: Level;
  rank: number;
  category: string;
  states?: string[];
  limit?: number;
}): Promise<RoundSummary> {
  const { level, rank, category } = opts;
  const limit = Math.min(opts.limit ?? 60, 200);
  const states = (opts.states ?? []).filter(Boolean);

  const stateFilter = states.length
    ? sql`AND st.name IN (${sql.join(
        states.map((s) => sql`${s}`),
        sql`, `,
      )})`
    : sql``;

  try {
    const [openedRows, tightenedRows, countRows, yearRows] = await Promise.all([
      // Out of reach in round 1, within reach later. The bigger the movement,
      // the more round 1 understated the seat.
      db.execute(sql`
        WITH p AS (${perSeat(level)})
        SELECT ${LABELLED}, p.year, p.r1, p.later, p.later_round
        FROM p ${JOINS}
        WHERE cat.code = ${category}
          AND p.r1 IS NOT NULL AND p.r1 < ${rank}
          AND p.later >= ${rank}
          ${stateFilter}
        ORDER BY (p.later - p.r1) DESC
        LIMIT ${limit}
      `),

      // Reachable in round 1, then the cut moved the wrong way. This is the
      // case that makes floating expensive.
      db.execute(sql`
        WITH p AS (${perSeat(level)})
        SELECT ${LABELLED}, p.year, p.r1, p.later, p.later_round
        FROM p ${JOINS}
        WHERE cat.code = ${category}
          AND p.r1 IS NOT NULL AND p.r1 >= ${rank}
          AND p.later IS NOT NULL
          AND p.later < p.r1
          ${stateFilter}
        ORDER BY (p.r1 - p.later) DESC
        LIMIT ${limit}
      `),

      db.execute(sql`
        WITH p AS (${perSeat(level)})
        SELECT
          COUNT(*) FILTER (WHERE p.r1 < ${rank} AND p.later >= ${rank})::int AS opened,
          COUNT(*) FILTER (WHERE p.r1 >= ${rank} AND p.later IS NOT NULL AND p.later < p.r1)::int AS tightened
        FROM p ${JOINS}
        WHERE cat.code = ${category} AND p.r1 IS NOT NULL ${stateFilter}
      `),

      db.execute(sql`
        SELECT DISTINCT year FROM closing_ranks
        WHERE level = ${level} ORDER BY year DESC
      `),
    ]);

    const counts = rows<{ opened: number; tightened: number }>(countRows)[0];

    return {
      opened: rows<Record<string, unknown>>(openedRows).map(toMove),
      tightened: rows<Record<string, unknown>>(tightenedRows).map(toMove),
      openedTotal: counts?.opened ?? 0,
      tightenedTotal: counts?.tightened ?? 0,
      years: rows<{ year: number }>(yearRows).map((r) => r.year),
    };
  } catch (error) {
    // An empty answer is honest here; an invented one would not be.
    console.error("[getRoundMoves]", error);
    return { opened: [], tightened: [], openedTotal: 0, tightenedTotal: 0, years: [] };
  }
}

/** Categories this level actually publishes, for the picker. */
export async function getRoundFacets(level: Level) {
  try {
    const [catRows, stateRows] = await Promise.all([
      db.execute(sql`
        SELECT cat.code, COUNT(*)::int AS n
        FROM closing_ranks cr
        JOIN categories cat ON cat.id = cr.category_id
        WHERE cr.level = ${level}
        GROUP BY cat.code ORDER BY n DESC LIMIT 12
      `),
      db.execute(sql`
        SELECT DISTINCT st.name
        FROM closing_ranks cr
        JOIN institutes i ON i.id = cr.institute_id
        JOIN states st ON st.id = i.state_id
        WHERE cr.level = ${level}
        ORDER BY st.name
      `),
    ]);
    return {
      categories: rows<{ code: string }>(catRows).map((r) => r.code),
      states: rows<{ name: string }>(stateRows).map((r) => r.name),
    };
  } catch (error) {
    console.error("[getRoundFacets]", error);
    return { categories: level === "ug" ? ["UR"] : ["GEN"], states: [] };
  }
}
