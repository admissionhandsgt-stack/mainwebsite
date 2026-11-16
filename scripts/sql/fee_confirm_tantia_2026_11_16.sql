-- Dr S S Tantia, Sri Ganganagar (owner, 2026-11-16: keep as printed, with a caution). zyn-92 re-checked the figures the
-- same day: the Rajasthan NEET PG board's own 2026-27 private-college fee sheet (pg.neetrajasthan.com/notifications/
-- 1792689067505.pdf, posted 22-10-2026, pp.7-8, columns "AI / STATE / MGMT NATURE TUITION FEES (YEARLY)") prints MD
-- Radio-Diagnosis Rs 95,00,000 / 95,00,000 / 1,00,00,000, General Medicine 60 L / 60 L / 70 L, Paediatrics 50 L / 50 L /
-- 60 L, Anaesthesiology 25 L / 25 L / 30 L; Tantia University's office order TU/Reg(04)/2026/437 of 10-02-2026 prints the
-- same as "Annual Fee (in INR per year)". Two official documents agree, so the figures stay; they are far above the state's
-- other private colleges, so each clinical figure of Rs 25 L or more carries the "as printed — confirm" note (it rides on
-- fee_label after " - ", as in fee_confirm_notes_2026_11_04.sql). Guarded on the current label, so it never overwrites a
-- later pass.
--   node --env-file=.env.local scripts/tmp/harness/apply_sql.mjs scripts/sql/fee_confirm_tantia_2026_11_16.sql
BEGIN;

UPDATE fees f
   SET fee_label = 'Tuition fee - as printed in the Rajasthan board''s 2026-27 fee sheet (a year), far above the state''s other private colleges - confirm with the college before paying',
       updated_at = now()
  FROM institutes i
 WHERE i.id = f.institute_id AND i.level = 'pg' AND i.name ILIKE 'Dr SS Tantia Medical College%'
   AND f.fee_source IS NOT NULL AND f.fee_label = 'Tuition fee' AND f.fee_inr >= 2500000;

COMMIT;
