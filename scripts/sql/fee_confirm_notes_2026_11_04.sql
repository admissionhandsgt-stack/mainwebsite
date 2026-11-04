-- "As printed — confirm" notes on figures the documents print but that look odd (zyn-c9, 4 Nov 2026, after re-reading
-- each source; the figures stay as applied). The note rides on fee_label after " - " and shows under the bracket
-- (feeKind in lib/chance.ts). Guarded on the row's current figure and label, so a later pass is never overwritten.
--   node scripts/apply_migration.mjs scripts/sql/fee_confirm_notes_2026_11_04.sql

BEGIN;

-- Dr S S Tantia, Rajasthan: the board's 2026-27 private-college fee sheet (page 7) prints Rs 4,650 a year for five
-- pre-/para-clinical MD branches, All India and State alike.
UPDATE fees
   SET fee_label = 'Tuition fee - as printed in the board''s 2026-27 fee sheet - confirm with the college before paying',
       updated_at = now()
 WHERE id IN (22636, 22643, 22664, 22671, 22832, 22839, 22945, 22952, 22975, 22982)
   AND fee_inr = 4650 AND fee_label = 'Tuition fee';

-- Yenepoya, MD Pharmacology, Govt quota: KEA's 02-11-2026 sheet prints Rs 10,000.
UPDATE fees
   SET fee_label = 'Fee (as KEA lists it - includes the university''s registration / admission fees, not itemised; Rs 10,000 as KEA prints it - confirm with KEA)',
       updated_at = now()
 WHERE id = 15819 AND fee_inr = 10000
   AND fee_label = 'Fee (as KEA lists it - includes the university''s registration / admission fees, not itemised)';

-- Basaveshwara, MS General Surgery, NRI and Others: KEA prints Rs 45.65 L; the college's own Govt Order says Rs 45.70 L.
UPDATE fees
   SET fee_label = 'Fee (as KEA lists it - includes the university''s registration / admission fees, not itemised; KEA prints Rs 45.65 L where the college''s own Govt Order says Rs 45.70 L - confirm with KEA)',
       updated_at = now()
 WHERE id IN (17144, 17114) AND fee_inr = 4565000
   AND fee_label = 'Fee (as KEA lists it - includes the university''s registration / admission fees, not itemised)';

COMMIT;
