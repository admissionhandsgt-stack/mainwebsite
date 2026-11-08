-- The alerts bar, 8 Nov 2026: what the rules added that day (lib/zynNotices.ts, lib/alertFeed.ts) would have kept off.
-- 1. AMRU's "Atal Medical H.P. 6967 --" is its MD/MS exam re-totalling notification (the PDF's name), not counselling;
--    Bihar's "online portal of PGMAC[HOMEOPATH]-2026" is AYUSH. Off the bar, and held in Admin → Notices (Zyn), where
--    the owner can still publish either.
-- 2. Himachal's Round 1 merit list was on the bar twice (Zyn's copy first, then the site's own feed): keep Zyn's.
-- 3. MCC's "Resignation … upto 5:00 pm of 09/11/2026" was dated the 9th (its deadline) and led the bar; it was approved on
--    the 6th — dated so.
-- Re-runnable.

BEGIN;

UPDATE live_alerts SET expires_at = now()
 WHERE source_key IN ('zyn:0d8866c9', 'zyn:28fd55b1') AND (expires_at IS NULL OR expires_at > now());

UPDATE zyn_notices
   SET status = 'held',
       reason = CASE id WHEN '0d8866c9' THEN 'not MBBS/BDS/NEET PG counselling (an exam re-totalling notice)'
                        ELSE 'not MBBS/BDS/NEET PG counselling (AYUSH)' END
 WHERE id IN ('0d8866c9', '28fd55b1') AND status = 'published';

UPDATE live_alerts a SET expires_at = now()
 WHERE a.source = 'hp' AND a.is_active AND (a.expires_at IS NULL OR a.expires_at > now())
   AND EXISTS (SELECT 1 FROM live_alerts b WHERE b.link = a.link AND b.id < a.id AND b.is_active
                AND (b.expires_at IS NULL OR b.expires_at > now()));

UPDATE live_alerts SET published_at = '2026-11-06T15:18:27Z'
 WHERE source_key = 'zyn:4bf03c05' AND published_at > '2026-11-08T00:00:00Z';

COMMIT;
