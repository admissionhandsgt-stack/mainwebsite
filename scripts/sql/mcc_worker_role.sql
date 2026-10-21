-- The mcc-worker container's database role (2026-10-21). The worker downloads and parses PDFs
-- from the internet, so it can write only its own three tables and read the two it needs:
--   mcc_round_results       what it found on MCC and where each round stands
--   mcc_allotments_staging  the rows it read, which the app moves into mcc_allotments
--   mcc_worker_log          what it did ("last checked MCC at …" on the round pages)
--   mcc_seat_matrix (read)  the counselling year now running
--   content_blocks (read)   the admin's pg_schedule — when to check every two minutes
-- The password is set on the server by scripts/setup_mcc_worker.sh and lives only in
-- /opt/admissionhands/mcc-worker.env (mode 600). Idempotent.
--
-- Run: ora_psql < scripts/sql/mcc_worker_role.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mcc_worker') THEN
    CREATE ROLE mcc_worker LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT CONNECTION LIMIT 4;
  END IF;
END $$;

GRANT USAGE ON SCHEMA public TO mcc_worker;
GRANT SELECT, INSERT, UPDATE ON mcc_round_results TO mcc_worker;
GRANT SELECT, INSERT, DELETE ON mcc_allotments_staging TO mcc_worker;
GRANT SELECT, INSERT, DELETE ON mcc_worker_log TO mcc_worker;
GRANT USAGE ON SEQUENCE mcc_worker_log_id_seq TO mcc_worker;
GRANT SELECT ON mcc_seat_matrix, content_blocks TO mcc_worker;

SELECT table_name, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
  FROM information_schema.role_table_grants WHERE grantee = 'mcc_worker' GROUP BY table_name ORDER BY table_name;
