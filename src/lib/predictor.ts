/**
 * Seat reachability from published closing ranks.
 *
 * This is historical, not predictive. Nothing here forecasts what a cut will
 * do this year — it states where the cut actually landed in the rounds that
 * have already been published, and places a candidate's rank against that.
 * Every label below is defensible from a row in `closing_ranks`.
 *
 * The bands, safest first:
 *
 *   safe       rank is inside the FIRST round's cut  — allotted immediately
 *   likely     rank is inside the WIDEST cut of that year — came through on movement
 *   possible   rank is inside the widest cut ever    — has happened, not recently
 *   stretch    rank is past anything on record       — no precedent
 */

export type ChanceBand = "safe" | "likely" | "possible" | "stretch";

export interface SeatOptionRow {
  r1Latest: number | null;
  widestLatest: number | null;
  widestPrevious: number | null;
  furthestEver: number | null;
  latestYear: number | null;
  seatsLatest: number | null;
  yearsOfData: number;
  lowConfidence: boolean;
}

export interface ChanceResult {
  band: ChanceBand;
  /** 0-100. A readable summary of the band plus how far inside it the rank sits. */
  score: number;
  /** One sentence a counsellor could say out loud, citing the actual numbers. */
  reason: string;
  /** Year-on-year direction of the last-round cut, when two years exist. */
  movement: { delta: number; direction: "easier" | "tighter" | "flat" } | null;
}

const BAND_LABEL: Record<ChanceBand, string> = {
  safe: "Safe",
  likely: "Likely",
  possible: "Possible",
  stretch: "Stretch",
};

export function bandLabel(band: ChanceBand): string {
  return BAND_LABEL[band];
}

/** Sort order used everywhere results are listed. */
export const BAND_ORDER: ChanceBand[] = ["safe", "likely", "possible", "stretch"];

function movementOf(row: SeatOptionRow): ChanceResult["movement"] {
  if (row.widestLatest == null || row.widestPrevious == null) return null;
  const delta = row.widestLatest - row.widestPrevious;
  // Ranks are inverted: a bigger closing rank means the cut reached further
  // down the list, i.e. it got easier.
  if (Math.abs(delta) < 25) return { delta, direction: "flat" };
  return { delta, direction: delta > 0 ? "easier" : "tighter" };
}

/**
 * Scores within a band by how comfortably the rank clears the relevant cut,
 * so a rank of 200 against a 9,000 cut does not read the same as 8,990.
 */
function comfort(rank: number, cut: number, floor: number, ceiling: number): number {
  if (cut <= 0) return floor;
  const margin = (cut - rank) / cut; // 0 at the boundary, →1 far inside
  const eased = Math.max(0, Math.min(1, margin));
  return Math.round(floor + eased * (ceiling - floor));
}

export function chanceFor(rank: number, row: SeatOptionRow): ChanceResult {
  const movement = movementOf(row);
  const year = row.latestYear ?? null;
  const yearSuffix = year ? ` in ${year}` : "";

  if (row.r1Latest != null && rank <= row.r1Latest) {
    return {
      band: "safe",
      score: comfort(rank, row.r1Latest, 80, 97),
      reason: `Round 1 closed at ${row.r1Latest.toLocaleString("en-IN")}${yearSuffix} — your rank was inside it.`,
      movement,
    };
  }

  if (row.widestLatest != null && rank <= row.widestLatest) {
    return {
      band: "likely",
      score: comfort(rank, row.widestLatest, 52, 79),
      reason: `The cut reached ${row.widestLatest.toLocaleString("en-IN")} across the rounds${yearSuffix}, though round 1 closed at ${
        row.r1Latest != null ? row.r1Latest.toLocaleString("en-IN") : "a tighter rank"
      }.`,
      movement,
    };
  }

  if (row.furthestEver != null && rank <= row.furthestEver) {
    return {
      band: "possible",
      score: comfort(rank, row.furthestEver, 20, 50),
      reason: `This seat has gone as far as ${row.furthestEver.toLocaleString("en-IN")} before, but not${yearSuffix}.`,
      movement,
    };
  }

  const widest = row.furthestEver ?? row.widestLatest;
  return {
    band: "stretch",
    score: widest ? Math.max(2, comfort(rank, widest, 2, 18)) : 5,
    reason: widest
      ? `The cut has never gone past ${widest.toLocaleString("en-IN")} on record.`
      : "No published cut on record for this seat.",
    movement,
  };
}

/** Human summary for a set of results — used above the list. */
export function summarise(results: { band: ChanceBand }[]) {
  const counts: Record<ChanceBand, number> = { safe: 0, likely: 0, possible: 0, stretch: 0 };
  for (const r of results) counts[r.band]++;
  return counts;
}
