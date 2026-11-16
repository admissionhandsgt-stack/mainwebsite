-- What we found about a PG college's stipend and bond beyond its own documents (2026-11-16, owner: "deep jao blogs news
-- forums… sahi info honi chaiye"). One row per institute, from a research pass over the colleges whose own 2026-27 notice
-- the official files (pg_bond_colleges / pg_stipend_colleges) could not read. Each field carries its status — official /
-- corroborated / single_report / conflicting / not_found — and every source's URL, date and quote.
--
-- The owner's rules for it (same day):
--   * on the public site only a CORROBORATED stipend is shown (labelled as reported, below the official figure and above
--     the counselling listing); official finds go to the PG data session's official files instead;
--   * `concerns` (residents' complaints, NMC fines, an ED charge-sheet) are for counsellors only — staff screens, never a
--     public page, never the repo (the repo on GitHub is public; the data stays in the database).
-- Loaded by scripts/import_college_research.ts from the research files outside the repo. Raw SQL, not in schema.ts.
CREATE TABLE IF NOT EXISTS college_research (
  institute_id integer PRIMARY KEY REFERENCES institutes(id) ON DELETE CASCADE,
  state text,
  stipend jsonb,                       -- { y1, y2, y3, session, status, sources[], notes }
  bond jsonb,                          -- { years, amount_inr, seat_leaving, deposit, status, sources[], notes }
  concerns jsonb,                      -- staff only: [{ what, sources[] }]
  extra jsonb,                         -- anything else the research recorded (bond history, extra findings)
  checked_on date NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS college_research_state ON college_research (state);
