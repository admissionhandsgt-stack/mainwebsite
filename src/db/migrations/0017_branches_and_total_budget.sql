-- Several preferred branches, and what the whole thing can cost.
--
-- ## Why `preferred_branches` is an array and `preferred_branch` stays
--
-- Nobody aims at one branch. A candidate at rank 38,000 is weighing Radiology
-- against Dermatology against Paediatrics, and a counsellor who is told only
-- the first of those builds the wrong shortlist. So `users` gets a real array.
--
-- `leads.preferred_branch` stays a single text column and receives the list
-- joined with commas. A lead is read by a person, not queried by the product,
-- and the admin screen and the CSV export already render that column — turning
-- it into an array would break both to gain nothing a counsellor can use.
--
-- ## Why the total is asked and not multiplied
--
-- It is tempting to compute it: PG is three years, so total ≈ 3 × yearly. That
-- is wrong often enough to matter. The fee is only part of it — a management
-- seat carries a deposit and a bond, a hostel and a city cost money, and some
-- states charge different fees in later years. More to the point, what a family
-- can raise over three years is not three times what they can find this year;
-- it is its own number, and it is the one that decides whether a seat is real.
--
-- Both budgets are stored as the **ceiling in rupees**, not as a band id, so a
-- query can compare them against `fees.fee_inr` directly. The bands are a UI
-- affordance; the number is the data.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_branches text[],
  -- Rupees, over the whole course. NULL is "did not say", which is not the
  -- same as "no limit" — nothing may filter on a guess.
  ADD COLUMN IF NOT EXISTS budget_total_max   bigint;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS budget_total_max bigint;

-- Existing single preferences become a one-element array, so the new column is
-- never emptier than the old one it supersedes.
UPDATE users
   SET preferred_branches = ARRAY[preferred_branch]
 WHERE preferred_branch IS NOT NULL
   AND preferred_branch <> ''
   AND preferred_branches IS NULL;
