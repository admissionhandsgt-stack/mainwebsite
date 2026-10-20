-- What a PG seat costs and binds you to, per college × course × seat type × counselling
-- (2026-10-20): fee, stipend by year, service bond (years, penalty), seat-leaving penalty and
-- debarment, hostel. Loaded by scripts/import_seat_terms.ts from the PG data session's export.
--
-- Provenance, kept honest: a third-party compilation (the owner's subscription), not an
-- official notice. Pages never call these figures official or verified, and say to confirm
-- with the state's notice or the college before paying. Only numbers and structured
-- facts are stored — never the compiler's written remarks.

CREATE TABLE IF NOT EXISTS pg_seat_terms (
  id                         serial  PRIMARY KEY,
  institute_id               integer REFERENCES institutes(id) ON DELETE SET NULL,
  match_confidence           real,
  state                      text,
  college_name               text    NOT NULL,
  institute_type             text,
  managing_authority         text,
  course                     text    NOT NULL,
  course_id                  integer REFERENCES courses(id),
  degree                     text,
  seat_type                  text,
  counselling                text,
  categories                 text,
  fee_inr                    bigint,
  nri_fee_usd                integer,
  fee_session                text,
  fee_session_basis          text,
  stipend_y1                 integer,  -- ₹ a month
  stipend_y2                 integer,
  stipend_y3                 integer,
  bond_years                 smallint, -- 0 = no bond; null with bond_unknown = not stated
  bond_unknown               boolean NOT NULL DEFAULT false,
  bond_penalty_inr           bigint,
  bond_terms_vary_by         text,
  hostel_fee_min_inr         integer,
  hostel_fee_max_inr         integer,
  hostel_fee_period          text,     -- year | month | null = not stated
  hostel_included_in_fee     boolean,
  hostel_includes_mess       boolean,
  seat_leaving_penalty_inr   bigint,
  seat_leaving_no_penalty    boolean,
  seat_leaving_refund_stipend boolean,
  seat_leaving_full_course_fee boolean,
  seat_leaving_debarment_years smallint,
  go_reference               text,
  details_source             text,
  source_type                text    NOT NULL,
  source_url                 text,
  fetched_on                 date,
  as_of                      text
);
CREATE INDEX IF NOT EXISTS pg_seat_terms_institute_idx ON pg_seat_terms (institute_id);
CREATE INDEX IF NOT EXISTS pg_seat_terms_state_idx ON pg_seat_terms (state, seat_type);
