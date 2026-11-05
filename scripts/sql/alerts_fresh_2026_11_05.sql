-- The alerts bar: latest first, this year's only, nothing past its dates (owner, 2026-11-05).
-- 1. Automatic notices older than 14 days are retired (the feed's lifetime is 14 days from today; was 30).
-- 2. MCC's 8 Oct "PG All India Quota schedule" is superseded by its Round 2 rescheduling; the "MCC (SS): / -->" row is a
--    scraped page title, not a notice.
-- 3. The rescheduling itself — plain text on MCC's PG page, no PDF, so the feed could not take it — goes on the bar
--    by hand, linking MCC's page, until 9 Nov (MCC's revised dates replace it).

BEGIN;

UPDATE live_alerts SET expires_at = now()
 WHERE is_active AND auto AND coalesce(published_at, created_at) < now() - interval '14 days'
   AND (expires_at IS NULL OR expires_at > now());

UPDATE live_alerts SET expires_at = now()
 WHERE is_active AND (title = 'MCC (PG): PG All India Quota schedule 2026' OR title LIKE 'MCC (SS): / -->%');

INSERT INTO live_alerts (title, link, is_active, order_index, source, source_key, auto, published_at, expires_at)
VALUES ('MCC (PG): NEET PG 2026 Round 2 rescheduled — new seats verified till 6 Nov; revised dates from 7 Nov',
        'https://mcc.nic.in/pg-medical-counselling/', true, 0, 'mcc-pg-notice', 'manual:mcc-pg-r2-rescheduled-2026',
        false, now(), '2026-11-09T18:30:00Z')
ON CONFLICT (source_key) WHERE source_key IS NOT NULL DO NOTHING;

COMMIT;
