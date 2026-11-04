-- A board's own word on a round's standing, printed beside its figures (2026-11-04): DME MP put NEET PG 2026
-- Round 1 on hold on 03.11.2026 after a High Court interim order, so its allotments are provisional and may
-- change. The note and the notice it comes from are the source's, carried with the rows.
ALTER TABLE state_round_cuts ADD COLUMN IF NOT EXISTS note text;
ALTER TABLE state_round_cuts ADD COLUMN IF NOT EXISTS note_url text;
