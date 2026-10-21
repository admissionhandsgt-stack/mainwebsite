-- 2026-10-21. The NEET PG round pages no longer say how they are built (owner: "hum apne logics and
-- tricks users ko kyu show kar rahe hai") — no "we check MCC every two minutes", no "last checked".
-- Three fields left the copy registry; their rows go only while they still hold the shipped default,
-- so an admin's own wording is never thrown away. Run after the deploy and after seed_page_copy.mjs.
--
-- Run: ora_psql < scripts/sql/round_page_copy_cleanup_2026_10_21.sql

BEGIN;

DELETE FROM site_settings WHERE key = 'page.pg_round.body.fact_checked' AND value = 'MCC last checked';
DELETE FROM site_settings WHERE key = 'page.pg_round.body.watch_title' AND value = 'This page updates itself';
DELETE FROM site_settings WHERE key = 'page.pg_round.body.watch_body' AND value LIKE 'We check MCC''s PG counselling page every two minutes%';

-- The alerts bar carried West Bengal's site header as a notice ("/ --> West Bengal Medical Counselling
-- Committee Admission and eCounselling Services", linking to the board's home page). Switched off,
-- which is final for the feed; lib/alertFeed.ts no longer takes a board's home page as a notice.
UPDATE live_alerts SET is_active = false WHERE source = 'wb' AND link ~ '^https?://wbmcc\.nic\.in/?$' AND is_active;

COMMIT;

SELECT key, left(value, 60) AS value FROM site_settings WHERE key LIKE 'page.pg_round.body.%' AND (key LIKE '%watch%' OR key LIKE '%checked%');
SELECT title, is_active FROM live_alerts WHERE source = 'wb' ORDER BY id DESC LIMIT 3;
