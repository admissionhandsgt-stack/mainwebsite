-- Live alerts that keep themselves current (2026-10-08).
--
-- The alerts bar was typed in by hand and went stale: a UGC-NET notice sat on a
-- NEET site, and the newest alert was two weeks old while MCC published round
-- results every few days. lib/alertFeed.ts now reads the official notice boards
-- (MCC, NBEMS, NTA and the state counselling authorities) on a schedule, adds
-- what is new, and every alert expires — 30 days after it was published, or
-- the day after the last date it names, whichever is first.

ALTER TABLE live_alerts
  ADD COLUMN IF NOT EXISTS source       text,
  ADD COLUMN IF NOT EXISTS source_key   text,
  ADD COLUMN IF NOT EXISTS auto         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at   timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS live_alerts_source_key ON live_alerts (source_key) WHERE source_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS live_alerts_live ON live_alerts (is_active, expires_at);

-- Hand-written alerts age out too, unless an admin sets an expiry themselves.
UPDATE live_alerts SET published_at = created_at WHERE published_at IS NULL;
UPDATE live_alerts SET expires_at = created_at + interval '30 days' WHERE expires_at IS NULL AND auto = false;

-- Every notice the feed has ever read, published or not. The first run records
-- the boards' whole backlog here without publishing it, so the bar is not
-- flooded with last year's notices; after that, a key not in this table is new.
CREATE TABLE IF NOT EXISTS alert_feed_seen (
  key          text PRIMARY KEY,
  source       text NOT NULL,
  title        text NOT NULL,
  url          text NOT NULL,
  published_on date,
  first_seen   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alert_feed_seen_source ON alert_feed_seen (source, first_seen DESC);
