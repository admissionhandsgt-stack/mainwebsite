import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { logError } from "@/lib/logger";

/**
 * NEET PG and medical seats statistics (2026-11-10; owner: "NEET PG / medical seats statistics 2026 banado"). A page made
 * to be cited — every figure counted from a register or a result we hold, nothing typed:
 *
 *  - candidates ranked and the score at milestone ranks, per year — NBEMS's own result (`score_ranks`);
 *  - PG seats on NMC's register by course type and ownership, and the clinical / para-clinical / pre-clinical split of
 *    MD/MS seats (`nmc_courses`, NMC files deemed universities as Private);
 *  - the rest (MCC's matrix, rounds, stipend, fees) comes from the existing readers the page also calls.
 *
 * Server only.
 */
export interface YearScores {
  year: number;
  ranked: number;
  outOf: number;
  top: number;
  /** Score held at each milestone rank. */
  at: { rank: number; score: number }[];
}
export interface NmcSeatRow {
  type: string;
  govtSeats: number;
  privateSeats: number;
  seats: number;
  colleges: number;
}
export interface PgStatistics {
  scores: YearScores[];
  nmc: NmcSeatRow[];
  mbbs: NmcSeatRow | null;
  /** MD/MS seats by kind of branch. */
  kinds: { kind: "Clinical" | "Para-clinical" | "Pre-clinical"; seats: number; branches: number }[];
  nmcUpdated: string | null;
  /** Seats MCC added to the year's matrix after round 1 (its "newly added seats" notices), when any were loaded. */
  added: { seats: number; title: string; url: string | null } | null;
}

export const MILESTONES = [1_000, 10_000, 25_000, 50_000, 1_00_000, 1_50_000, 2_00_000];

/** NMC's course names, by kind. Everything else on the MD/MS list is clinical. */
const PRE = /anatomy|physiology|biochemistry|biophysics/i;
const PARA = /patholog|microbiolog|pharmacolog|forensic|community medicine|preventive|social|laborator|lab medicine|hospital administration|community health|public health|epidemiolog/i;

const TYPE_ORDER = ["MD", "MS", "Diploma", "DM", "M.Ch."];
const TYPE_LABEL: Record<string, string> = { MD: "MD", MS: "MS", Diploma: "PG Diploma", DM: "DM (super speciality)", "M.Ch.": "M.Ch. (super speciality)", "M.B.B.S.": "MBBS" };

export const getPgStatistics = unstable_cache(
  async (): Promise<PgStatistics | null> => {
    try {
      const [yrs, milestones, nmc, kinds, updated] = await Promise.all([
        db.execute(sql`
          SELECT year::int, MAX(rank_max)::int AS ranked, MAX(score_out_of)::int AS out_of, MAX(score)::int AS top
            FROM score_ranks WHERE exam = 'pg' GROUP BY year ORDER BY year`),
        db.execute(sql`
          SELECT s.year::int, m.rk::int AS rank, s.score::int
            FROM (SELECT unnest(${sql.raw(`ARRAY[${MILESTONES.join(",")}]`)}::int[]) AS rk) m
            JOIN score_ranks s ON s.exam = 'pg' AND m.rk BETWEEN s.rank_min AND s.rank_max`),
        db.execute(sql`
          SELECT course_type AS t,
                 COALESCE(SUM(approved_seat) FILTER (WHERE management_type = 'Government'), 0)::int AS govt,
                 COALESCE(SUM(approved_seat) FILTER (WHERE management_type <> 'Government'), 0)::int AS private,
                 COALESCE(SUM(approved_seat), 0)::int AS seats,
                 COUNT(DISTINCT college_code)::int AS colleges
            FROM nmc_courses
           WHERE course_type IN ('M.B.B.S.', 'MD', 'MS', 'Diploma', 'DM', 'M.Ch.')
           GROUP BY course_type`),
        db.execute(sql`
          SELECT course_name AS name, COALESCE(SUM(approved_seat), 0)::int AS seats
            FROM nmc_courses WHERE course_type IN ('MD', 'MS') GROUP BY course_name`),
        db.execute(sql`SELECT MAX(nmc_updated)::text AS d FROM nmc_courses`),
      ]);
      const addedRow = ((await db.execute(sql`
        SELECT SUM(total_seats)::int AS seats, MAX(source_title) AS title, MAX(source_file) AS url
          FROM mcc_seat_matrix WHERE source_title ILIKE '%newly added%' AND year = (SELECT MAX(year) FROM mcc_seat_matrix)`)) as unknown as {
        seats: number | null; title: string | null; url: string | null;
      }[])[0];
      const ys = yrs as unknown as { year: number; ranked: number; out_of: number; top: number }[];
      const ms = milestones as unknown as { year: number; rank: number; score: number }[];
      const scores: YearScores[] = ys.map((y) => ({
        year: Number(y.year),
        ranked: Number(y.ranked),
        outOf: Number(y.out_of),
        top: Number(y.top),
        at: MILESTONES.filter((r) => r <= Number(y.ranked))
          .map((r) => ({ rank: r, score: Number(ms.find((m) => Number(m.year) === Number(y.year) && Number(m.rank) === r)?.score ?? NaN) }))
          .filter((x) => Number.isFinite(x.score)),
      }));

      const rowsN = (nmc as unknown as { t: string; govt: number; private: number; seats: number; colleges: number }[]).map((r) => ({
        type: TYPE_LABEL[r.t] ?? r.t,
        key: r.t,
        govtSeats: Number(r.govt),
        privateSeats: Number(r.private),
        seats: Number(r.seats),
        colleges: Number(r.colleges),
      }));
      const mbbsRow = rowsN.find((r) => r.key === "M.B.B.S.");
      const pg = rowsN.filter((r) => r.key !== "M.B.B.S.").sort((a, b) => TYPE_ORDER.indexOf(a.key) - TYPE_ORDER.indexOf(b.key));

      const k = { Clinical: { seats: 0, branches: 0 }, "Para-clinical": { seats: 0, branches: 0 }, "Pre-clinical": { seats: 0, branches: 0 } };
      for (const r of kinds as unknown as { name: string; seats: number }[]) {
        const kind = PRE.test(r.name) ? "Pre-clinical" : PARA.test(r.name) ? "Para-clinical" : "Clinical";
        k[kind].seats += Number(r.seats);
        k[kind].branches += 1;
      }
      const strip = ({ key: _key, ...r }: (typeof rowsN)[number]): NmcSeatRow => r;
      return {
        scores,
        nmc: pg.map(strip),
        mbbs: mbbsRow ? strip(mbbsRow) : null,
        kinds: (Object.keys(k) as (keyof typeof k)[]).map((kind) => ({ kind, ...k[kind] })),
        nmcUpdated: (updated as unknown as { d: string | null }[])[0]?.d ?? null,
        added: addedRow?.seats ? { seats: Number(addedRow.seats), title: addedRow.title ?? "", url: addedRow.url } : null,
      };
    } catch (error) {
      logError(error, { route: "pgStatistics" });
      return null;
    }
  },
  ["pg-statistics-v2"],
  { revalidate: 3600, tags: ["nmc", "mcc"] },
);
