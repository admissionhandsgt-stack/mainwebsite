-- The eight things a counsellor needs before they can advise anybody.
--
-- The gate has been earning phone numbers and almost nothing else. Of the six
-- leads before this change, four had no name, four had no rank, and none had a
-- branch, a state or a budget — so every one of them started with a counsellor
-- ringing a stranger and asking the questions from scratch.
--
-- ## Why these columns are split across two tables
--
-- `users` holds what the visitor told us about themselves. It is theirs, it
-- persists, and the tools read it back so their next visit opens where they
-- left off — that is what the account is for.
--
-- `leads` holds what was true at the moment they asked us for something. A lead
-- is a record of an enquiry, and it must not change afterwards: if somebody
-- updates their rank in November, the enquiry they made in September still said
-- what it said. `RESOURCE_SPECS.leads` exists for the same reason.
--
-- So the profile is written to `users` and *copied* to the lead. They drift
-- apart on purpose.
--
-- ## Why `budget_max` is a number and the rest are text
--
-- Budget filters the seat list, so it has to be comparable against `fee_inr`.
-- The others are either free text a counsellor reads (MBBS college) or a label
-- whose set we do not control tightly enough to make an enum worth the
-- migration it would cost later (attempt, branch, state).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_branch     text,
  ADD COLUMN IF NOT EXISTS preferred_state      text,
  -- Rupees a year, matching fees.fee_inr. NULL means "did not say", which is
  -- not the same as "no limit" — the seat list must not filter on a guess.
  ADD COLUMN IF NOT EXISTS budget_max           bigint,
  ADD COLUMN IF NOT EXISTS attempt              text,
  ADD COLUMN IF NOT EXISTS mbbs_college         text,
  -- When the tuner was last completed, so the UI can stop asking and the admin
  -- can tell a full profile from a half-finished one.
  ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS attempt      text,
  ADD COLUMN IF NOT EXISTS budget_max   bigint,
  ADD COLUMN IF NOT EXISTS mbbs_college text;

-- The admin lists leads newest-first and filters by how complete they are;
-- without this that is a sequential scan over every enquiry ever made.
CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at DESC);
