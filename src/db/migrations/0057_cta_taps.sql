-- WhatsApp, call and Telegram taps by page (2026-11-11, the competitive review's "WhatsApp taps logged per page"):
-- content pages convert through taps, which the leads table never sees, and GA4 shows them only in aggregate. One row
-- per IST day × page × kind × placement with a count — never the number tapped, never who tapped it. Written by
-- POST /api/tap (ClickTracker's beacon), read by Admin → Taps by page. Raw SQL, not in schema.ts.
CREATE TABLE IF NOT EXISTS cta_taps (
  day        date NOT NULL,
  path       text NOT NULL,
  kind       text NOT NULL,
  placement  text NOT NULL,
  n          integer NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path, kind, placement)
);
CREATE INDEX IF NOT EXISTS cta_taps_day ON cta_taps (day);
