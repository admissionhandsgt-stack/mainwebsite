-- MCC's revised NEET PG 2026 Round 2 schedule, into the admin's pg_schedule (2026-11-08).
-- Source: MCC Notice No. 5, Ref. U-12021/09/2026-MEC, dated 07.11.2026 — "the schedule of Round-2 of PG Counselling 2026
-- has been modified as under due to addition of New PG seats in the seat matrix of Round-2 as approved by NMC"
-- (uploads/2026/11/20261107776874972.pdf, a scanned PDF; read page by page). Approved on Telegram by the owner through
-- Zyn on 7 Nov; the automatic path held it only because MCC spells the round "Round-2" (fixed in lib/zynNotices.ts).
-- Times are MCC's server time, copied as printed:
--   1 seat matrix verification by institutes  upto 11:00 AM of 09.11.2026
--   2 resignation from Round-1 seat without forfeiture  upto 06:00 PM of 09.11.2026
--   3 registration      1:00 PM of 7 Nov – 3:00 PM of 14 Nov      4 edit/reset  3:00 PM of 7 Nov – 1:00 PM of 14 Nov
--   5 payment           upto 6:00 PM of 14 Nov
--   6 choice filling    1:00 PM of 10 Nov – 11:55 PM of 15 Nov    7 choice locking  4:00 PM of 14 Nov – 11:55 PM of 15 Nov
--   8 seat processing and provisional result  16 Nov              9 final result  17 Nov
--  10 reporting         18 – 24 Nov                              11 verification of joined candidates' data  25 Nov
-- The window ends on the provisional result (the day a student first sees the round's outcome, and the day the MCC
-- worker's 2-minute checks centre on). Round 3 and the stray round stay "awaited" — this notice gives no dates for them.
-- Re-runnable.

BEGIN;

UPDATE content_blocks SET data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
  'aiq', '7 – 16 Nov',
  'aiq_join_by', '24 Nov',
  'registration', '7 – 14 Nov, till 3 PM of 14 Nov (fee payment till 6 PM)',
  'choice_filling', '10 – 15 Nov, from 1 PM of 10 Nov till 11:55 PM of 15 Nov',
  'choice_locking', '4 PM of 14 Nov to 11:55 PM of 15 Nov',
  'result', '16 Nov (provisional), 17 Nov (final)',
  'reporting', '18 – 24 Nov',
  'source', 'revised schedule, MCC notice no. 5 of 7 Nov 2026',
  'source_url', 'https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/11/20261107776874972.pdf')
 WHERE collection = 'pg_schedule' AND title = 'Round 2';

-- The Zyn notice that carried it: applied.
UPDATE zyn_notices
   SET schedule_status = 'applied',
       schedule_reason = 'applied 8 Nov from MCC notice no. 5 (checked against the PDF); held only by the "Round-2" spelling',
       decided_at = now()
 WHERE id = 'babf9973' AND schedule_status = 'held';

-- The alerts bar. The hand-written "Round 2 rescheduled … revised dates from 7 Nov" is answered by the schedule itself.
UPDATE live_alerts SET expires_at = now()
 WHERE source_key = 'manual:mcc-pg-r2-rescheduled-2026' AND (expires_at IS NULL OR expires_at > now());

-- The schedule notice is on the bar twice (Zyn's copy, then the site's own MCC feed with the same PDF): keep Zyn's.
UPDATE live_alerts a SET expires_at = now()
 WHERE a.source = 'mcc-pg' AND a.is_active AND (a.expires_at IS NULL OR a.expires_at > now())
   AND EXISTS (SELECT 1 FROM live_alerts b WHERE b.link = a.link AND b.id < a.id AND b.is_active
                AND (b.expires_at IS NULL OR b.expires_at > now()));

-- "Resignation for round 1 joined candidates … upto 5:00 pm of 09/11/2026": MCC's notice no. 5 extends it to 6 PM of
-- 9 Nov. Off the bar once that has passed (6 PM IST = 12:30 UTC), not on 20 Nov.
UPDATE live_alerts SET expires_at = '2026-11-09T12:30:00Z'
 WHERE source_key = 'zyn:4bf03c05' AND (expires_at IS NULL OR expires_at > '2026-11-09T12:30:00Z');

COMMIT;
