-- A state counselling's round results for a year still in progress, kept apart from closing_ranks
-- (owner, 2026-11-04: "Predictor mai 2026 round 1 ka data use mat karo bas feed karke rakho").
--
-- closing_ranks feeds seat_options, and seat_options keeps one row per seat for its LATEST year: a 2026
-- round 1 there would replace each seat's whole 2025 counselling (rounds 1–4) with one round, and the
-- predictor's "Good chance" band (inside the year's widest cut) would collapse to round 1's close. So these
-- rows live here, where nothing that reads closing_ranks — the predictor, college bands, branch and state
-- ranges — can see them. The PG state page shows them as "this year so far", group figures over 3+
-- colleges only (the chance-view rule). When the year's rounds are complete they can move into closing_ranks.
--
-- Loaded by scripts/import_state_round.ts from the official allotment PDFs, as extracted by the PG data
-- session. No names, roll numbers or registration ids are stored.

CREATE TABLE IF NOT EXISTS state_round_cuts (
  id                  serial      PRIMARY KEY,
  level               level       NOT NULL DEFAULT 'pg',
  state_id            integer     NOT NULL REFERENCES states(id),
  year                smallint    NOT NULL,
  round               text        NOT NULL,            -- 'R1', 'R2' …
  round_printed       text        NOT NULL,            -- "Round 1, allotted 02/11/2026"
  counselling         text        NOT NULL,            -- as printed
  source_url          text,
  institute_id        integer     REFERENCES institutes(id),  -- null when no college of ours matched
  college_printed     text        NOT NULL,
  inst_code           text,
  course_id           integer     REFERENCES courses(id),     -- null when no course of ours matched
  course_printed      text        NOT NULL,
  quota               text        NOT NULL,            -- our label for the seat type, as 2025's rows name it
  seat_type_printed   text,
  category            text        NOT NULL,            -- GEN | OBC | SC | ST | EWS | MBC, else as printed
  category_printed    text        NOT NULL,
  pwd                 boolean     NOT NULL DEFAULT false,
  additional_category text,                            -- e.g. Rajasthan's STA
  in_service          boolean     NOT NULL DEFAULT false,
  seats_allotted      integer,
  opening_air         integer,
  closing_air         integer,
  opening_state_rank  integer,
  closing_state_rank  integer,
  imported_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS state_round_cuts_state ON state_round_cuts (state_id, level, year, round);

CREATE TABLE IF NOT EXISTS state_round_allotments (
  id                  serial      PRIMARY KEY,
  level               level       NOT NULL DEFAULT 'pg',
  state_id            integer     NOT NULL REFERENCES states(id),
  year                smallint    NOT NULL,
  round               text        NOT NULL,
  counselling         text        NOT NULL,
  institute_id        integer     REFERENCES institutes(id),
  college_printed     text        NOT NULL,
  inst_code           text,
  course_id           integer     REFERENCES courses(id),
  course_printed      text        NOT NULL,
  quota               text        NOT NULL,
  seat_type_printed   text,
  category            text        NOT NULL,
  category_printed    text        NOT NULL,
  own_category        text,
  pwd                 boolean     NOT NULL DEFAULT false,
  additional_category text,
  in_service          boolean     NOT NULL DEFAULT false,
  domicile            text,
  state_rank          integer,
  air                 integer,
  neet_score          smallint,
  imported_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS state_round_allotments_state ON state_round_allotments (state_id, level, year, round);
