-- When a fee row last changed (2026-10-26).
--
-- `fees` had no timestamp, so the official 2026-27 fee passes (2026-10-25 Maharashtra, 2026-10-26 every
-- other state) left no date anywhere and the sitemap could not tell Google that those college pages had
-- changed. Nullable with no default on purpose: an imported row's change date is unknown, and a default of
-- now() would make every one of 39,000 rows claim today. The sourced rows get the day they were applied;
-- apply_state_fees.mjs and apply_official_fees.mjs stamp now() from here on. Adding a nullable column
-- rewrites nothing; seat_options lists its columns by name and is untouched.
--   node scripts/apply_migration.mjs src/db/migrations/0044_fees_updated_at.sql

BEGIN;

ALTER TABLE fees ADD COLUMN IF NOT EXISTS updated_at timestamptz;

UPDATE fees f SET updated_at = TIMESTAMPTZ '2026-10-25 18:00:00+05:30'
  FROM institutes i JOIN states s ON s.id = i.state_id
 WHERE f.institute_id = i.id AND f.fee_source IS NOT NULL AND f.updated_at IS NULL AND s.name = 'Maharashtra';

UPDATE fees f SET updated_at = TIMESTAMPTZ '2026-10-26 12:00:00+05:30'
  FROM institutes i JOIN states s ON s.id = i.state_id
 WHERE f.institute_id = i.id AND f.fee_source IS NOT NULL AND f.updated_at IS NULL AND s.name <> 'Maharashtra';

COMMIT;
