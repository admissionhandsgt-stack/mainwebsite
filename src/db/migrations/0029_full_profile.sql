-- The complete candidate profile, asked step by step in the Admission Chance
-- flow (2026-10-12), and a log of the chance views each account asks for.
--
-- ## Why so many fields now
--
-- The business decision of 2026-10-12: no closing rank for a named college is
-- shown to anybody. What a signed-in student gets instead is their colleges in
-- chance words, and what we get is the whole picture a counsellor needs before
-- the first call — MBBS, BDS and PG each ask their own questions. Every one of
-- these is optional at the column level: the flow decides what is required for
-- which course, and NULL stays "did not say", never a default.
--
-- ## Two copies, as before (see 0016)
--
-- `users` is what the student says about themselves and may change; `leads`
-- is what was true when they asked, and must not.
--
-- ## chance_queries
--
-- A chance view is computed for the account's own rank. Letting one account
-- ask for any rank, any number of times, would let it walk the boundaries and
-- rebuild every college's closing rank from the words alone. So each distinct
-- (level, rank, category) an account asks for is logged, and the API caps how
-- many distinct ones a day it will answer. It is also the record of what each
-- student actually looked at, which is what the counsellor opens the call with.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stream            text,
  ADD COLUMN IF NOT EXISTS neet_score        integer,
  ADD COLUMN IF NOT EXISTS pwd               boolean,
  ADD COLUMN IF NOT EXISTS gender            text,
  ADD COLUMN IF NOT EXISTS domicile_state    text,
  ADD COLUMN IF NOT EXISTS preferred_states  text[],
  ADD COLUMN IF NOT EXISTS college_types     text[],
  ADD COLUMN IF NOT EXISTS seat_types        text[],
  ADD COLUMN IF NOT EXISTS mbbs_state        text,
  ADD COLUMN IF NOT EXISTS internship_status text,
  ADD COLUMN IF NOT EXISTS service_quota     boolean,
  ADD COLUMN IF NOT EXISTS bond_ok           text,
  ADD COLUMN IF NOT EXISTS city              text,
  ADD COLUMN IF NOT EXISTS guardian_phone    text,
  ADD COLUMN IF NOT EXISTS profile_extra     jsonb;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS stream            text,
  ADD COLUMN IF NOT EXISTS neet_score        integer,
  ADD COLUMN IF NOT EXISTS pwd               boolean,
  ADD COLUMN IF NOT EXISTS gender            text,
  ADD COLUMN IF NOT EXISTS domicile_state    text,
  ADD COLUMN IF NOT EXISTS preferred_states  text,
  ADD COLUMN IF NOT EXISTS college_types     text,
  ADD COLUMN IF NOT EXISTS seat_types        text,
  ADD COLUMN IF NOT EXISTS mbbs_state        text,
  ADD COLUMN IF NOT EXISTS service_quota     boolean,
  ADD COLUMN IF NOT EXISTS bond_ok           text,
  ADD COLUMN IF NOT EXISTS city              text,
  ADD COLUMN IF NOT EXISTS guardian_phone    text,
  ADD COLUMN IF NOT EXISTS options_seen      integer;

CREATE TABLE IF NOT EXISTS chance_queries (
  id         bigserial PRIMARY KEY,
  user_id    integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level      text    NOT NULL,
  stream     text    NOT NULL,
  rank       integer NOT NULL,
  category   text    NOT NULL,
  options    integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chance_queries_user_day ON chance_queries (user_id, created_at DESC);
