-- MCC has rescheduled NEET PG 2026 Round 2 (its PG page, LATEST NEWS, last updated 04.11.2026): "Seat matrix for newly
-- approved seats for round 2 of NEET PG counselling 2026 received from NMC on 3/11/2026. The seat matrix will be verified
-- by the concerned institutes after application of reservation roster till 06/11/2026. Therefore round 2 counselling
-- schedule will be rescheduled from 07/11/2026 onwards."
--
-- So the tentative dates of 29 Oct (scripts/sql/pg_schedule_steps_2026_11_05.sql) no longer hold for Round 2, and Round 3
-- and the stray round follow it. Their windows and steps are taken off until MCC publishes the revised schedule; the round
-- pages then show "dates awaited" (no date-shaped text here, so nothing reads a false expected date), and the MCC worker
-- checks every 30 minutes instead of every 2. Round 1 is history and stays. Re-runnable.
-- The aiq text is read in a sentence ("Round 2 of MCC's counselling runs {window}.") and in tables, so it is worded for both.
-- When MCC posts the revised schedule: put the new aiq / aiq_join_by and the step fields back (same keys as before).

BEGIN;

UPDATE content_blocks
   SET data = (COALESCE(data, '{}'::jsonb) - 'registration' - 'choice_filling' - 'choice_locking' - 'result' - 'reporting' - 'source' - 'source_url')
              || jsonb_build_object('aiq', 'later than planned — MCC is rescheduling it (new dates awaited)', 'aiq_join_by', '—',
                                    'state', 'After MCC''s revised Round 2', 'state_join_by', '—')
 WHERE collection = 'pg_schedule' AND title = 'Round 2';

UPDATE content_blocks
   SET data = (COALESCE(data, '{}'::jsonb) - 'registration' - 'choice_filling' - 'choice_locking' - 'result' - 'reporting' - 'source' - 'source_url')
              || jsonb_build_object('aiq', 'after Round 2 — MCC''s revised dates awaited', 'aiq_join_by', '—',
                                    'state', 'Follows the state''s Round 2', 'state_join_by', '—')
 WHERE collection = 'pg_schedule' AND title IN ('Round 3', 'Stray vacancy');

COMMIT;
