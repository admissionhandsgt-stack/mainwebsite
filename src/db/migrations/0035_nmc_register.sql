-- The National Medical Commission's own register of colleges and courses (2026-10-18).
--
-- The UG counselling extract records no ownership (every UG institute is 'other'), no
-- university and, for most colleges, no intake — so the MBBS directory could not say which
-- colleges are government, and fee ranges by type could not be computed. NMC publishes all
-- of it, per college and per course, on its public college-and-course search
-- (nmc.org.in/information-desk-college-and-course-search). This mirrors that register:
--
--   nmc_courses     one row per (college, course), exactly as NMC lists it — the source rows
--   nmc_institutes  which of our institutes an NMC college is (UG and PG rows are separate
--                   institutes for the same college). Matched automatically only when the
--                   name and state agree beyond doubt; the rest are mapped in the admin.
--   nmc_sync_runs   every sync: when, how many rows, and whether it failed
--
-- Synced by lib/nmcSync.ts (Admin → Data sync, and a weekly cron). Never edited by hand:
-- a sync replaces the register wholesale, inside one transaction.

CREATE TABLE IF NOT EXISTS nmc_courses (
  college_code           text        NOT NULL,          -- NMC's code, e.g. 'AN/001/G/1'
  course_name            text        NOT NULL,          -- 'M.B.B.S.', 'M.D. (General Medicine)'
  course_type            text,                          -- 'M.B.B.S.', 'M.D.', 'M.S.', 'D.M.' …
  nmc_college_id         integer,
  college_name           text        NOT NULL,
  state_name             text,
  university_name        text,
  management_type        text,                          -- 'Government', 'Private', …, as NMC writes it
  inception_year         integer,
  approved_seat          integer,
  previous_approved_seat integer,
  recognition_status     text,
  remark                 text,
  lop_date               date,
  approval_date          date,
  nmc_updated            date,                          -- NMC's own updated_date for the row
  synced_at              timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (college_code, course_name)
);

CREATE INDEX IF NOT EXISTS nmc_courses_type_idx  ON nmc_courses (course_type);
CREATE INDEX IF NOT EXISTS nmc_courses_state_idx ON nmc_courses (state_name);

CREATE TABLE IF NOT EXISTS nmc_institutes (
  id           serial      PRIMARY KEY,
  college_code text        NOT NULL,
  -- Null only with method 'admin-none': "this NMC college is none of our institutes".
  institute_id integer     REFERENCES institutes(id) ON DELETE CASCADE,
  -- 'auto' rows are recomputed by every sync; 'admin' / 'admin-none' rows are a person's
  -- decision and a sync never touches them.
  method       text        NOT NULL CHECK (method IN ('auto', 'admin', 'admin-none')),
  score        real,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CHECK ((method = 'admin-none') = (institute_id IS NULL))
);

-- One NMC college can be two of our institutes (its UG and its PG row), but an institute is
-- at most one NMC college.
CREATE UNIQUE INDEX IF NOT EXISTS nmc_institutes_institute_key ON nmc_institutes (institute_id) WHERE institute_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS nmc_institutes_code_idx ON nmc_institutes (college_code);

CREATE TABLE IF NOT EXISTS nmc_sync_runs (
  id          serial      PRIMARY KEY,
  started_at  timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  rows        integer,
  colleges    integer,
  seats       integer,
  matched     integer,
  status      text        NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'ok', 'failed')),
  error       text,
  triggered_by text
);
