-- IndexNow as a stream, not a daily batch (2026-11-15). Bing Webmaster Tools flagged "IndexNow is in batch mode": the daily
-- run sent every page changed in two days in one request (4,119 on 10 Nov). Now an hourly run sends only pages whose
-- lastmod moved since they were last sent, a small group at a time; this table remembers what each page was sent at.
-- Raw SQL, not in schema.ts.
CREATE TABLE IF NOT EXISTS indexnow_sent (
  url text PRIMARY KEY,
  lastmod text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);
