-- Official PG stipend (2026-11-16, owner chose to wait for it: "bond ki tarah pura official"). Read by the PG data session
-- from each state's own order (or a government college's own NMC disclosure, labelled as such), NMC's rules and each
-- private or deemed college's own published stipend; every figure carries its source URL, page and quote. Loaded by
-- scripts/import_official_stipend.ts from pg_handoff/from_pg/official_stipend_all_states_2026-27.json, replacing both tables.
-- Kept apart from fees.stipend_*_inr (a third-party compilation). Raw SQL, not in schema.ts; jsonb because each state's
-- rule has its own shape. MD/MS only: no DNB / NBEMS figures.
CREATE TABLE IF NOT EXISTS pg_stipend_rules (
  slug text PRIMARY KEY,               -- the state's PG slug, or "national" (NMC's rules) / "central" (Central Govt institutes)
  state text NOT NULL,
  label text NOT NULL,
  data jsonb NOT NULL,
  as_of date,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pg_stipend_colleges (
  our_id integer PRIMARY KEY,          -- the handoff's key (= institutes.source_id at level pg)
  institute_id integer REFERENCES institutes(id) ON DELETE SET NULL,
  state text,
  status text NOT NULL,                -- official_2026_27 | official_older | states_no_stipend | not_verified
  data jsonb NOT NULL,
  as_of date,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pg_stipend_colleges_institute ON pg_stipend_colleges (institute_id);
CREATE INDEX IF NOT EXISTS pg_stipend_colleges_state ON pg_stipend_colleges (state);
