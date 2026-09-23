-- Index the normalised college name on both sides of the UG reconciliation.
--
-- `/mbbs-india/colleges` joins `institutes` (the complete 1,727-college list
-- the closing ranks attach to) against `ug_all_colleges` (the 765 the team
-- curates city, university and intake for). The two sources punctuate the same
-- college differently — "Government Medical College,Dindigul" against
-- "Government Medical College, Dindigul" — so the join strips punctuation and
-- case on both sides.
--
-- Without an index on that expression, Postgres has to compute it for every
-- pair: 1,727 x 765 regexp calls, which took the query from under a second to
-- nine. An expression index on each side lets it hash-join instead.

CREATE INDEX IF NOT EXISTS ug_all_colleges_name_key_idx
    ON ug_all_colleges ((regexp_replace(lower(college_name), '[^a-z0-9]', '', 'g')));

CREATE INDEX IF NOT EXISTS institutes_name_key_idx
    ON institutes ((regexp_replace(lower(name), '[^a-z0-9]', '', 'g')));

-- The page also counts published rounds per college to show which ones have
-- cutoff data. Grouping 43,999 rows by institute needs this.
CREATE INDEX IF NOT EXISTS closing_ranks_level_institute_idx
    ON closing_ranks (level, institute_id);
