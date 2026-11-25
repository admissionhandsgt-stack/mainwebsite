-- What leaving each PG seat costs, from the official 2026-27 research (2026-11-25): the PG tool session's
-- pg_handoff/from_pg/seat_leaving_terms_2026-27.json, one row per college × seat type, its `public_text` built from
-- official_bond_2026_27.json (the State's / MCC's / the college's own 2026-27 words; English, no source notes, no listing
-- figure). Loaded by scripts/import_seat_leaving.ts (replaces the table). Read by lib/seatLeaving.ts for the college page's
-- "Leaving the seat" row, over the state-level rule in lib/officialLeaving.ts. Raw SQL, not in schema.ts.
CREATE TABLE IF NOT EXISTS pg_seat_leaving (
  institute_id integer NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
  seat_type text NOT NULL,             -- as pg_seat_terms.seat_type spells it (the tool's quota label)
  counselling text,
  status text NOT NULL,                -- official | official_none_stated | dnb_no_sum_set | not_confirmed
  public_text text NOT NULL DEFAULT '',
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  as_of date,
  imported_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (institute_id, seat_type)
);
