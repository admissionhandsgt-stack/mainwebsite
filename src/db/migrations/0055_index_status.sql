-- Google's index status per page (2026-11-11), from the URL Inspection runs (scripts/gsc_coverage.mjs), pushed by
-- scripts/push_index_status.mjs after each run. Read by lib/indexBoost.ts: an indexed page links its not-yet-indexed
-- neighbours (same state / branch), so Google is told those pages matter. Raw SQL, not in schema.ts.
CREATE TABLE IF NOT EXISTS index_status (
  path        text PRIMARY KEY,
  coverage    text NOT NULL,
  verdict     text,
  last_crawl  timestamptz,
  checked_at  timestamptz NOT NULL
);
