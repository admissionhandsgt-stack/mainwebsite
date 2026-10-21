-- MCC's round results, fetched and published by themselves (2026-10-20, owner's request: "page
-- automatic ban jaye… har 2-2 min fetch… turant banade").
--
-- The mcc-worker container (deploy/oracle/mcc-worker) watches MCC's PG page — every 2 minutes in a
-- round's result window (read from the admin's pg_schedule), every 30 otherwise. When a round's
-- result PDF appears it records it here, downloads it, parses it with pdfplumber into
-- mcc_allotments_staging, and asks the app (POST /api/cron/mcc-results) to publish: the app maps
-- courses and colleges, replaces that round in mcc_allotments, refreshes the pages, alerts the team
-- and pings IndexNow. /neet-pg-counselling/<year>/<round> reads it.

CREATE TABLE IF NOT EXISTS mcc_round_results (
  year          smallint    NOT NULL,
  round         text        NOT NULL,   -- 'Round 1' | 'Round 2' | 'Round 3' | 'Stray Vacancy Round' | 'Special Stray Vacancy Round'
  kind          text,                   -- 'provisional' | 'final' | 'result' — as MCC titled it
  status        text        NOT NULL,   -- 'detected' | 'parsing' | 'live' | 'parse_failed'
  source_title  text,
  source_url    text,
  detected_at   timestamptz NOT NULL DEFAULT now(),
  published_at  timestamptz,            -- when the parsed page went live
  updated_at    timestamptz NOT NULL DEFAULT now(),
  rows          integer,
  error         text,
  PRIMARY KEY (year, round)
);

-- Raw rows from the worker; the app moves them into mcc_allotments on ingest.
CREATE TABLE IF NOT EXISTS mcc_allotments_staging (
  year               smallint NOT NULL,
  round              text     NOT NULL,
  rank               integer  NOT NULL,
  quota              text,
  institute          text,
  course             text,
  allotted_category  text,
  candidate_category text,
  option_no          text,
  remarks            text,
  pdf_page           integer
);
CREATE INDEX IF NOT EXISTS mcc_allotments_staging_round_idx ON mcc_allotments_staging (year, round);

-- What the worker did, newest first; the admin reads it and the page's "last checked" line comes from it.
CREATE TABLE IF NOT EXISTS mcc_worker_log (
  id      serial      PRIMARY KEY,
  at      timestamptz NOT NULL DEFAULT now(),
  level   text        NOT NULL,   -- 'check' | 'found' | 'parsed' | 'live' | 'error'
  message text        NOT NULL
);
CREATE INDEX IF NOT EXISTS mcc_worker_log_at_idx ON mcc_worker_log (at DESC);

-- Which alerts the team has had for the PDF now recorded, so a retried download or a re-run never
-- sends the same WhatsApp twice. Cleared when MCC posts a different PDF for the round (the final).
ALTER TABLE mcc_round_results ADD COLUMN IF NOT EXISTS alerted_detected_url text;
ALTER TABLE mcc_round_results ADD COLUMN IF NOT EXISTS alerted_live_url text;
