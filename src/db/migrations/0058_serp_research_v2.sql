-- Search research, second version (2026-11-11, owner: "hourly review lagao… bot ko smart banao wo real searches keywords,
-- combinations etc ko search kar paye aur accurate data de… save kare aur analyse bhi kar paye sahi se").
-- serp_research gains what the analysis decided: where the query came from (Search Console or autocomplete), the facts
-- found with their sources, our page's title and the searched words it lacks, the advice and a priority.
-- serp_suggest holds the real searches Google and Bing autocomplete offer for our seeds (entity × intent combinations
-- and Hinglish phrasings); serp_seeds remembers when each seed was last asked. Raw SQL, not in schema.ts.
ALTER TABLE serp_research ADD COLUMN IF NOT EXISTS kind      text    NOT NULL DEFAULT 'gsc';
ALTER TABLE serp_research ADD COLUMN IF NOT EXISTS facts     jsonb   NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE serp_research ADD COLUMN IF NOT EXISTS our_title text;
ALTER TABLE serp_research ADD COLUMN IF NOT EXISTS title_gap text[]  NOT NULL DEFAULT '{}';
ALTER TABLE serp_research ADD COLUMN IF NOT EXISTS advice    jsonb   NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE serp_research ADD COLUMN IF NOT EXISTS priority  real    NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS serp_research_created ON serp_research (created_at DESC);

CREATE TABLE IF NOT EXISTS serp_suggest (
  query         text PRIMARY KEY,
  seed          text NOT NULL,
  engines       text[] NOT NULL DEFAULT '{}',
  times_seen    integer NOT NULL DEFAULT 1,
  first_seen    timestamptz NOT NULL DEFAULT now(),
  last_seen     timestamptz NOT NULL DEFAULT now(),
  researched_on date
);
CREATE INDEX IF NOT EXISTS serp_suggest_todo ON serp_suggest (researched_on, times_seen DESC);

CREATE TABLE IF NOT EXISTS serp_seeds (
  seed      text PRIMARY KEY,
  last_run  timestamptz,
  found     integer NOT NULL DEFAULT 0
);
