-- "MCC posted a notice … the dates may change" (2026-11-09, owner: "MCC reschedule kardeta hai … kahi galat info dikhate
-- na rahe"). lib/zynNotices.ts writes data.revision / .revision_url / .revision_on on a round's pg_schedule row when an
-- approved MCC notice moves its dates but cannot be read into them; the round's pages then say the dates may change and
-- link the notice. Applying a schedule clears them. This adds the three fields to the collection so Admin -> Content ->
-- "NEET PG · MCC schedule" shows them and the team can clear the line by hand after typing the new dates.
-- Run after the release that reads them. Re-runnable: it only changes a field list that lacks them.

UPDATE content_collections
   SET fields = to_jsonb('["title","data.aiq","data.aiq_join_by","data.state","data.state_join_by","data.registration","data.choice_filling","data.choice_locking","data.result","data.reporting","data.source","data.source_url","data.revision","data.revision_url","data.revision_on"]'::text)
 WHERE slug = 'pg_schedule' AND jsonb_typeof(fields) = 'string' AND fields::text NOT LIKE '%revision%';
