/**
 * NEET score → rank range, from the exam body's published result (migration 0040). Server only.
 *
 * The predictor's score-first form (2026-10-20, owner's request): the student types the score, sees
 * the range of ranks that score holds — every candidate with the same score shares it, so it is a
 * range, not a rank — and then types the exact rank from the scorecard inside it. Only NEET PG has
 * rows (NBEMS publishes every candidate's score and rank); NEET UG has no complete official source.
 */
import { unstable_cache } from "next/cache";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { logError } from "@/lib/logger";

export type ScoreExam = "pg";

export interface ScoreRange {
  exam: ScoreExam;
  year: number;
  score: number;
  outOf: number;
  rankMin: number;
  rankMax: number;
  candidates: number | null;
  source: string;
  sourceUrl: string | null;
}

interface Table {
  year: number;
  outOf: number;
  minScore: number;
  maxScore: number;
  rows: Map<number, ScoreRange>;
}

const load = (exam: ScoreExam) =>
  unstable_cache(
    async (): Promise<{ year: number; outOf: number; minScore: number; maxScore: number; rows: ScoreRange[] } | null> => {
      try {
        const r = (await db.execute(sql`
          SELECT year, score, score_out_of, rank_min, rank_max, candidates_at_score, source_title, source_url
            FROM score_ranks
           WHERE exam = ${exam} AND year = (SELECT MAX(year) FROM score_ranks WHERE exam = ${exam})
           ORDER BY score DESC`)) as unknown as {
          year: number;
          score: number;
          score_out_of: number;
          rank_min: number;
          rank_max: number;
          candidates_at_score: number | null;
          source_title: string;
          source_url: string | null;
        }[];
        if (!r.length) return null;
        return {
          year: r[0].year,
          outOf: r[0].score_out_of,
          maxScore: r[0].score,
          minScore: r[r.length - 1].score,
          rows: r.map((x) => ({
            exam,
            year: x.year,
            score: x.score,
            outOf: x.score_out_of,
            rankMin: x.rank_min,
            rankMax: x.rank_max,
            candidates: x.candidates_at_score,
            source: x.source_title,
            sourceUrl: x.source_url,
          })),
        };
      } catch (error) {
        logError(error, { route: `scoreRank:${exam}` });
        return null;
      }
    },
    ["score-ranks-v1", exam],
    { revalidate: 86_400, tags: ["score-ranks"] },
  )();

async function table(exam: ScoreExam): Promise<Table | null> {
  const t = await load(exam);
  return t ? { ...t, rows: new Map(t.rows.map((r) => [r.score, r])) } : null;
}

export type ScoreLookup =
  | { ok: true; range: ScoreRange }
  | { ok: false; reason: "no-data" | "out-of-range" | "no-candidate"; year?: number; outOf?: number; minScore?: number; maxScore?: number };

/** The rank range a score held in the latest year we hold for the exam. */
export async function scoreRange(exam: ScoreExam, score: number): Promise<ScoreLookup> {
  const t = await table(exam);
  if (!t) return { ok: false, reason: "no-data" };
  const meta = { year: t.year, outOf: t.outOf, minScore: t.minScore, maxScore: t.maxScore };
  if (score > t.maxScore || score < t.minScore) return { ok: false, reason: "out-of-range", ...meta };
  const range = t.rows.get(score);
  // Every candidate with a result is in the table, so a score with no row is one nobody had.
  return range ? { ok: true, range } : { ok: false, reason: "no-candidate", ...meta };
}

export interface ScoreTable {
  year: number;
  outOf: number;
  maxScore: number;
  minScore: number;
  /** Candidates with a published rank. */
  ranked: number;
  source: string;
  sourceUrl: string | null;
  /** Highest score first. */
  rows: { score: number; rankMin: number; rankMax: number; candidates: number | null }[];
}

/** Every year's whole list, newest first — the marks-vs-rank page prints them. */
export const getScoreTables = (exam: ScoreExam) =>
  unstable_cache(
    async (): Promise<ScoreTable[]> => {
      try {
        const r = (await db.execute(sql`
          SELECT year, score, score_out_of, rank_min, rank_max, candidates_at_score, source_title, source_url
            FROM score_ranks WHERE exam = ${exam} ORDER BY year DESC, score DESC`)) as unknown as {
          year: number; score: number; score_out_of: number; rank_min: number; rank_max: number;
          candidates_at_score: number | null; source_title: string; source_url: string | null;
        }[];
        const years = new Map<number, ScoreTable>();
        for (const x of r) {
          const t = years.get(x.year) ?? { year: x.year, outOf: x.score_out_of, maxScore: x.score, minScore: x.score, ranked: 0,
            source: x.source_title, sourceUrl: x.source_url, rows: [] };
          t.rows.push({ score: x.score, rankMin: x.rank_min, rankMax: x.rank_max, candidates: x.candidates_at_score });
          t.minScore = x.score;
          t.ranked = Math.max(t.ranked, x.rank_max);
          years.set(x.year, t);
        }
        return [...years.values()];
      } catch (error) {
        logError(error, { route: `scoreRank:tables:${exam}` });
        return [];
      }
    },
    ["score-tables-v1", exam],
    { revalidate: 86_400, tags: ["score-ranks"] },
  )();

/** Which exams have a table, and its year — the form shows the score field only for these. */
export async function scoreExams(): Promise<{ exam: ScoreExam; year: number; outOf: number }[]> {
  const t = await load("pg");
  return t ? [{ exam: "pg", year: t.year, outOf: t.outOf }] : [];
}
