-- MCC's own published data (2026-10-20): the NEET PG seat matrix and the AIQ allotment
-- results, read from MCC's PDFs by the PG data session and handed over as CSV
-- (D:\Admisson Hands\pg_handoff\from_pg). Loaded by scripts/import_mcc_handoff.ts.
--
-- Official and citable, unlike the closing ranks we hold from an aggregator — which is why
-- each row keeps the PDF it came from. The allotments carry ranks: under the 2026-10-12
-- rule no page shows one college's rank; they feed aggregates over three or more colleges,
-- counts, and checks of our own data.

CREATE TABLE IF NOT EXISTS mcc_seat_matrix (
  id               serial  PRIMARY KEY,
  year             integer NOT NULL,
  programme        text    NOT NULL,   -- MD | MS | Diploma | DNB | DNB Diploma | M.Ch.
  seat_matrix      text    NOT NULL,   -- AIQ | Deemed | Central Institutes Internal Quota | DNB
  state            text,
  mcc_institute_code text,
  mcc_college_name text    NOT NULL,
  mcc_course       text    NOT NULL,   -- MCC's own label
  course_id        integer REFERENCES courses(id),        -- ours, via lib/mccCourses.ts
  quota            text,
  open_seats       integer NOT NULL DEFAULT 0,
  open_pwd         integer NOT NULL DEFAULT 0,
  ews              integer NOT NULL DEFAULT 0,
  ews_pwd          integer NOT NULL DEFAULT 0,
  obc              integer NOT NULL DEFAULT 0,
  obc_pwd          integer NOT NULL DEFAULT 0,
  sc               integer NOT NULL DEFAULT 0,
  sc_pwd           integer NOT NULL DEFAULT 0,
  st               integer NOT NULL DEFAULT 0,
  st_pwd           integer NOT NULL DEFAULT 0,
  total_seats      integer NOT NULL,
  institute_id     integer REFERENCES institutes(id) ON DELETE SET NULL,
  match_confidence real,
  match_method     text,               -- handoff | admin
  source_title     text,
  source_file      text
);
CREATE INDEX IF NOT EXISTS mcc_seat_matrix_institute_idx ON mcc_seat_matrix (institute_id);
CREATE INDEX IF NOT EXISTS mcc_seat_matrix_course_idx ON mcc_seat_matrix (year, course_id);

CREATE TABLE IF NOT EXISTS mcc_allotments (
  id                 serial  PRIMARY KEY,
  year               integer NOT NULL,
  round              text    NOT NULL,
  rank               integer,
  quota              text,
  mcc_college_name   text    NOT NULL,
  state              text,
  mcc_course         text    NOT NULL,
  course_id          integer REFERENCES courses(id),
  allotted_category  text,
  candidate_category text,
  status             text,
  institute_id       integer REFERENCES institutes(id) ON DELETE SET NULL,
  match_confidence   real,
  match_method       text,
  source_title       text,
  source_file        text
);
CREATE INDEX IF NOT EXISTS mcc_allotments_institute_idx ON mcc_allotments (institute_id);
CREATE INDEX IF NOT EXISTS mcc_allotments_round_idx ON mcc_allotments (year, round);
CREATE INDEX IF NOT EXISTS mcc_allotments_course_idx ON mcc_allotments (year, course_id, quota);

-- Hand decisions about MCC college names live in scripts/data/mcc_name_decisions.json, versioned with
-- the code, and are applied by the import (match_method = 'admin').
DROP TABLE IF EXISTS mcc_institute_names;
