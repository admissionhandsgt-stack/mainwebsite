-- "None of ours" for one level only (2026-10-20).
--
-- An NMC college can be ours at one level and not the other: Kiran Medical College,
-- Surat is one of our MD/MS colleges, but its MBBS seats are in no counselling list we
-- hold. 'admin-none' closed a code at both levels, so marking its MBBS side "none"
-- would have stopped the next sync re-pairing its MD/MS side. With a level, it closes
-- that level only; a row without one (none exist yet) still closes both.
ALTER TABLE nmc_institutes
  ADD COLUMN IF NOT EXISTS level text CHECK (level IN ('ug', 'pg'));
