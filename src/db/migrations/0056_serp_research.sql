-- What the web answers for the searches we are shown for (2026-11-11, owner: "bot ya agent banao jo hamare tavily api se
-- websearches kare… research save karke ek report banake de"). One row per query per run: the AI answer, the top
-- results, where admissionhands.com stands among them, and the figures in the answer that our page does not carry.
-- Written by lib/serpResearch.ts (daily cron); read by Admin → Search research. Raw SQL, not in schema.ts.
CREATE TABLE IF NOT EXISTS serp_research (
  id           serial PRIMARY KEY,
  run_on       date NOT NULL,
  query        text NOT NULL,
  page         text,
  impressions  integer,
  position     real,
  answer       text,
  results      jsonb NOT NULL DEFAULT '[]'::jsonb,
  our_rank     integer,
  missing      jsonb NOT NULL DEFAULT '[]'::jsonb,
  competitors  text[] NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_on, query)
);
CREATE INDEX IF NOT EXISTS serp_research_query ON serp_research (query, run_on DESC);
