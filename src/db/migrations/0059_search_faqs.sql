-- Search answers on our own pages (2026-11-11, owner: "review to ara hai lekin usko hum website mai kese implement +
-- target karenge visibility badhane ke liye… implementation bhi to chaiye"). The research bot finds a real search a page
-- of ours is shown for (or the hub that should answer it); when one of our data builders can answer it, the page carries
-- the search as a heading with the answer under it. Only the question is stored: the answer is built from live data
-- every time the page renders (lib/searchFaq.ts), so no figure here can go stale. Raw SQL, not in schema.ts.
CREATE TABLE IF NOT EXISTS search_faqs (
  id          serial PRIMARY KEY,
  page        text NOT NULL,
  question    text NOT NULL,
  kind        text,
  source      text NOT NULL DEFAULT 'research',
  status      text NOT NULL DEFAULT 'live',
  impressions integer,
  position    real,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS search_faqs_page_q ON search_faqs (page, lower(question));
CREATE INDEX IF NOT EXISTS search_faqs_live ON search_faqs (page) WHERE status = 'live';
