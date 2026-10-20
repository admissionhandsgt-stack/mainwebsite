-- NEET score → rank, from the exam body's own published result (2026-10-20). One row per score:
-- the range of ranks every candidate with that score holds (ties share a score, not a rank).
-- Loaded by scripts/import_score_ranks.ts from the PG data session's export of NBEMS's NEET-PG
-- result PDFs (2025, 2026). Only score and rank — no roll numbers or application IDs.
--
-- Read by /api/score-rank for the predictor's score-first form: type the score, see the rank
-- range it maps to, then the exact rank inside it. NEET UG has no complete official source, so
-- no UG rows exist and the UG form stays rank-first.

CREATE TABLE IF NOT EXISTS score_ranks (
  exam                text     NOT NULL,          -- 'pg' (NEET PG)
  year                smallint NOT NULL,
  score               smallint NOT NULL,
  score_out_of        smallint NOT NULL,
  rank_min            integer  NOT NULL,
  rank_max            integer  NOT NULL,
  candidates_at_score integer,
  source_title        text     NOT NULL,
  source_url          text,
  fetched_on          date,
  PRIMARY KEY (exam, year, score)
);
