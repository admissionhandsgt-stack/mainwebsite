-- Official PG service bond and seat-leaving terms (2026-11-16, owner: "Bonds wgrh sahi se updated nhi hai… detailed mai
-- dalo"). Read by the PG data session from each state's own 2026-27 bulletin / prospectus / GO / gazette, MCC's bulletin and
-- each private or deemed college's own notice; every figure carries its source URL, page and a quote. Loaded by
-- scripts/import_official_bond.ts from pg_handoff/from_pg/official_bond_all_states_2026-27.json, replacing both tables.
-- Kept apart from pg_seat_terms (a third-party compilation): where an official row exists it replaces the compilation's
-- figure for that state or college. Raw SQL, not in schema.ts; data is jsonb because every state's rules have their own shape.
CREATE TABLE IF NOT EXISTS pg_bond_rules (
  slug text PRIMARY KEY,               -- the state's PG slug ("uttar-pradesh", "pondicherry"), or "mcc"
  state text NOT NULL,                 -- our states.name ("Pondicherry"), or "MCC"
  label text NOT NULL,                 -- the name as the source file gives it ("Puducherry")
  data jsonb NOT NULL,
  as_of date,
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pg_bond_colleges (
  our_id integer PRIMARY KEY,          -- the handoff's key (= institutes.source_id at level pg)
  institute_id integer REFERENCES institutes(id) ON DELETE SET NULL,
  state text,
  status text NOT NULL,                -- official_2026_27 | official_2025_26_only | none_in_official_documents | not_verified
  data jsonb NOT NULL,
  as_of date,
  imported_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pg_bond_colleges_institute ON pg_bond_colleges (institute_id);
CREATE INDEX IF NOT EXISTS pg_bond_colleges_state ON pg_bond_colleges (state);
