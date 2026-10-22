-- MCC's third round is "Round 3", not "Mop-Up" (owner, 2026-10-22: "tik kardo isko bhi"). The MD/MS
-- overview card and the MD/MS FAQ said "Round 1, Round 2, Mop-Up, Stray" while the parameter table beside
-- them said "R1, R2, R3, Stray" — and so do MCC's own result PDFs and the admin's `pg_schedule`. Many
-- states still call their third round mop-up, so the new words say that too. The process pages already
-- read "Round 3 / mop-up". Each row changes only while it still holds the old words. Re-runnable.

BEGIN;

UPDATE content_blocks SET
       body = '4 rounds typically: Round 1, Round 2, Round 3 and Stray Vacancy (many states still call their third round mop-up). Each round opens new opportunities.',
       updated_at = now()
 WHERE collection = 'pg_overview' AND title = 'Counselling Rounds'
   AND body = '4 rounds typically: Round 1, Round 2, Mop-Up, and Stray Vacancy. Each round opens new opportunities.';

UPDATE content_blocks SET
       body = 'Typically 4 rounds: Round 1, Round 2, Round 3 and the Stray Vacancy Round — MCC calls its third round Round 3; many states still call theirs mop-up. Each round has its own registration, choice filling, and allotment schedule. Seats vacated in earlier rounds become available in subsequent rounds, sometimes at lower cutoffs.',
       updated_at = now()
 WHERE collection = 'faq_pg' AND title = 'How many counselling rounds are there?'
   AND body = 'Typically 4 rounds: Round 1, Round 2, Mop-Up Round, and Stray Vacancy Round. Each round has its own registration, choice filling, and allotment schedule. Seats vacated in earlier rounds become available in subsequent rounds, sometimes at lower cutoffs.';

COMMIT;

SELECT collection, title, body FROM content_blocks
 WHERE (collection = 'pg_overview' AND title = 'Counselling Rounds')
    OR (collection = 'faq_pg' AND title = 'How many counselling rounds are there?');
