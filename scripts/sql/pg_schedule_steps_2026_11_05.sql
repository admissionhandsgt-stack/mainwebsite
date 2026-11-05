-- MCC's own steps for each NEET PG 2026 round, into the admin's pg_schedule (2026-11-05, owner's OK).
-- Source: MCC, "Tentative schedule for online counseling (allotment process) for NEET 50% AIQ and 100% deemed/central
-- universities/AFMS-only registration for PG courses for the academic year 2026" — the PG All India Quota schedule
-- posted 29 Oct 2026 (uploads/2026/10/20261029180954707.pdf). Dates copied as printed; times are MCC's server time.
-- Adds the fields to the collection (so Admin -> Content edits them) and merges the values into the four rows;
-- existing keys (aiq, aiq_join_by, state, state_join_by) are left as they are. Re-runnable.

BEGIN;

UPDATE content_collections
   SET fields = to_jsonb('["title","data.aiq","data.aiq_join_by","data.state","data.state_join_by","data.registration","data.choice_filling","data.choice_locking","data.result","data.reporting","data.source","data.source_url"]'::text)
 WHERE slug = 'pg_schedule' AND jsonb_typeof(fields) = 'string' AND fields::text NOT LIKE '%choice_filling%';

UPDATE content_blocks SET data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
  'registration', '12 – 21 Oct, till 12 noon of 21 Oct (fee payment till 3 PM)',
  'choice_filling', '13 – 22 Oct, till 10 AM of 22 Oct',
  'choice_locking', '4 PM of 21 Oct to 10 AM of 22 Oct',
  'result', '24 Oct',
  'reporting', '26 Oct – 2 Nov',
  'source', 'tentative schedule, posted 29 Oct 2026',
  'source_url', 'https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/10/20261029180954707.pdf')
 WHERE collection = 'pg_schedule' AND title = 'Round 1';

UPDATE content_blocks SET data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
  'registration', '6 – 11 Nov, till 12 noon of 11 Nov (fee payment till 3 PM)',
  'choice_filling', '7 – 12 Nov, till 10 AM of 12 Nov',
  'choice_locking', '4 PM of 11 Nov to 10 AM of 12 Nov',
  'result', '14 Nov',
  'reporting', '16 – 23 Nov',
  'source', 'tentative schedule, posted 29 Oct 2026',
  'source_url', 'https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/10/20261029180954707.pdf')
 WHERE collection = 'pg_schedule' AND title = 'Round 2';

UPDATE content_blocks SET data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
  'registration', '26 Nov – 1 Dec, till 12 noon of 1 Dec (fee payment till 3 PM)',
  'choice_filling', '27 Nov – 2 Dec, till 10 AM of 2 Dec',
  'choice_locking', '4 PM of 1 Dec to 10 AM of 2 Dec',
  'result', '4 Dec',
  'reporting', '5 – 12 Dec',
  'source', 'tentative schedule, posted 29 Oct 2026',
  'source_url', 'https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/10/20261029180954707.pdf')
 WHERE collection = 'pg_schedule' AND title = 'Round 3';

UPDATE content_blocks SET data = COALESCE(data, '{}'::jsonb) || jsonb_build_object(
  'registration', '16 – 21 Dec, till 12 noon of 21 Dec (fee payment till 3 PM)',
  'choice_filling', '16 – 21 Dec, till 11:55 PM of 21 Dec',
  'choice_locking', '4 PM to 11:55 PM of 21 Dec',
  'result', '24 Dec',
  'reporting', '24 – 31 Dec',
  'source', 'tentative schedule, posted 29 Oct 2026',
  'source_url', 'https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/10/20261029180954707.pdf')
 WHERE collection = 'pg_schedule' AND title = 'Stray vacancy';

COMMIT;
