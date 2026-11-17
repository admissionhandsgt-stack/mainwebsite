-- MCC's "AIQ and State Schedule PG 2026 dated 16.11.2026"
-- (https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/11/202611161679361332.pdf), approved by
-- the owner in Zyn on 17 Nov 00:42 IST and held by the site's own reader ("schedule notice without a round we know": the
-- combined table's rows name no round). Its rows, in MCC's usual order AIQ / State for each round:
--   Round 1  AIQ 12 Oct – 24 Oct, join till 2 Nov       State 21 Oct – 2 Nov, join till 10 Nov
--   Round 2  AIQ  6 Nov – 14 Nov, join till 24 Nov      State 14 Nov – 24 Nov, join till 30 Nov
--   Round 3  AIQ 26 Nov – 4 Dec,  join till 12 Dec      State  4 Dec – 12 Dec, join till 18 Dec
--   Stray    AIQ 16 Dec – 24 Dec, join till 31 Dec      State 22 Dec – 25 Dec, join till 31 Dec
-- Round 1 and 2 keep the round-wise notices' own step dates (more precise). Round 3 and the stray round had "dates
-- awaited" (2026-11-05 rule: put MCC's dates back the same day it posts them). Guarded on the "awaited" text, so a later
-- edit in Admin → Content is never overwritten.
BEGIN;

UPDATE content_blocks
   SET data = data || jsonb_build_object(
         'aiq', '26 Nov – 4 Dec', 'aiq_join_by', '12 Dec', 'state', '4 – 12 Dec', 'state_join_by', '18 Dec',
         'source', 'AIQ and State schedule, MCC, 16 Nov 2026',
         'source_url', 'https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/11/202611161679361332.pdf'),
       updated_at = now()
 WHERE collection = 'pg_schedule' AND title = 'Round 3' AND data->>'aiq' LIKE 'after Round 2%';

UPDATE content_blocks
   SET data = data || jsonb_build_object(
         'aiq', '16 – 24 Dec', 'aiq_join_by', '31 Dec', 'state', '22 – 25 Dec', 'state_join_by', '31 Dec',
         'source', 'AIQ and State schedule, MCC, 16 Nov 2026',
         'source_url', 'https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/11/202611161679361332.pdf'),
       updated_at = now()
 WHERE collection = 'pg_schedule' AND title = 'Stray vacancy' AND data->>'aiq' LIKE 'after Round 2%';

-- Round 2's state window is now known too.
UPDATE content_blocks
   SET data = data || jsonb_build_object('state', '14 – 24 Nov', 'state_join_by', '30 Nov'), updated_at = now()
 WHERE collection = 'pg_schedule' AND title = 'Round 2' AND data->>'state' = 'After MCC''s revised Round 2';

COMMIT;
