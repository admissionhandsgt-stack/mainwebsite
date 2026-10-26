-- PG closing ranks are All India Ranks everywhere (2026-10-27).
--
-- Every state counselling's rows (rank_basis = 'State/Counselling rank', 111,302 of 230,484 PG rows:
-- Maharashtra, Gujarat, TN, UP, Rajasthan, Telangana, AP, WB, Kerala, MP, Bihar, Haryana…) carried the
-- state's own merit-list number in closing_rank, while the predictor, seat_options, the branch and state
-- ranges and the college bands all compare it with a candidate's NEET PG All India Rank. A Maharashtra
-- state-quota seat that closed at merit no. 3,332 (AIR 41,327) read as out of reach for AIR 30,000.
--
-- Verified before changing anything: Gujarat's admission committee publishes every seat's last admitted
-- candidate with both numbers ("Institutewise Last Rank of PG-2025", Compiled_Closure_PG_2025-26_PGMDMS.pdf,
-- medadmgujarat.ncode.in). Of 1,579 college × branch × quota × category cells matched, ai_rank equals the
-- official NEET rank in 1,573 (99.6%) and closing_rank the official general merit no. in 1,574 (99.7%); the
-- six that differ are pre-clinical seats a later stray round moved. The import copies these columns from one
-- source for every state, and in every state ai_rank ≥ closing_rank. So ai_rank is the AIR of the candidate
-- who took the closing state rank, and the state rank is already kept in counselling_rank (equal to
-- closing_rank on all 111,302 rows).
--
-- So closing_rank becomes that AIR; counselling_rank keeps the state merit number; rank_basis still says
-- the state allotted the seat. In states that add marks for in-service doctors (AP, Odisha, Haryana, UP,
-- Rajasthan, Punjab, Bihar — where state order and AIR order part most) the last admitted candidate may
-- have held a bonus; the AIR is still the honest figure to set a candidate's AIR against.
-- UG is untouched: no UG state row carries an ai_rank.
--
-- Undo: UPDATE closing_ranks SET closing_rank = counselling_rank
--        WHERE level = 'pg' AND rank_basis = 'State/Counselling rank';  then refresh seat_options.
--   node scripts/apply_migration.mjs src/db/migrations/0045_pg_state_rank_to_air.sql

BEGIN;

UPDATE closing_ranks
   SET closing_rank = ai_rank
 WHERE level = 'pg'
   AND rank_basis = 'State/Counselling rank'
   AND ai_rank > 0
   AND closing_rank = counselling_rank;   -- not yet converted (idempotent)

REFRESH MATERIALIZED VIEW seat_options;

COMMIT;
