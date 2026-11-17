-- MCC kept the NEET PG 2026 Round 2 result on hold (owner, 2026-11-17: "website par update daldo notice aya hai MCC round
-- 2 on hold"). MCC Notice No. 10, Ref. U-12021/09/2026-MEC, dated 17.11.2026: seat processing for the result of Round-2
-- "has been kept on hold in view of order dated 17.11.2026 issued by the Hon'ble High Court of Judicature at Madras in
-- WP No. 46350 of 2026 … Sri Venkateshwaraa Medical College Hospital and Research Centre Vs. The Govt. of India & Ors."
-- — the order stays all further admission proceedings and joining by CENTAC and MCC, and MCC will declare the result only
-- after the High Court's clarification. https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/11/202611171047091852.pdf
--
-- 1. The schedule form gains `hold`, `hold_url`, `hold_on` (Admin → Content → "NEET PG · MCC schedule"): while `hold` is
--    set, the round's page says "on hold" with that reason. Empty the three fields when MCC lifts the hold.
-- 2. Round 2's row carries the hold, and MCC's notice as the "dates may change" line above every table of MCC's dates.
-- 3. The alerts bar's item for the notice says what it is.
-- Run after the release that reads `hold`. Re-runnable.
BEGIN;

UPDATE content_collections
   SET fields = to_jsonb('["title","data.aiq","data.aiq_join_by","data.state","data.state_join_by","data.registration","data.choice_filling","data.choice_locking","data.result","data.reporting","data.source","data.source_url","data.revision","data.revision_url","data.revision_on","data.hold","data.hold_url","data.hold_on"]'::text)
 WHERE slug = 'pg_schedule' AND jsonb_typeof(fields) = 'string' AND fields::text NOT LIKE '%data.hold%';

UPDATE content_blocks
   SET data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
         'hold', 'the Madras High Court''s interim stay of 17 Nov 2026 (WP No. 46350 of 2026) halts further admission and joining by MCC and CENTAC, and MCC will declare the result only after the court''s clarification',
         'hold_url', 'https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/11/202611171047091852.pdf',
         'hold_on', '2026-11-17',
         'revision', 'The seat processing for result of Round-2 of PG Counselling 2026 has been kept on hold in view of order dated 17.11.2026 issued by the Hon''ble High Court of Judicature at Madras; the result shall be declared only after receipt of the necessary clarification/direction from the High Court (Notice No. 10)',
         'revision_url', 'https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/11/202611171047091852.pdf',
         'revision_on', '2026-11-17'),
       updated_at = now()
 WHERE collection = 'pg_schedule' AND title = 'Round 2';

UPDATE live_alerts
   SET title = 'MCC: NEET PG Round 2 result on hold — Madras High Court interim stay (Notice No. 10, 17 Nov)'
 WHERE source_key = 'zyn:ba9c59c6';

COMMIT;
