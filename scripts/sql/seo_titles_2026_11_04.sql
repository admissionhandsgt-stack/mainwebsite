-- /neet-pg-process: its title was typed into page_seo on 2026-10-07 and is the same as the code's old
-- default, so the code's new title ("…Choice Filling & Rounds", from the 2026-11-04 keyword study) never
-- shows while the row holds it. Blank the title so the page's own applies. Guarded on the old text: an
-- admin's own wording is left alone.
UPDATE page_seo
   SET title = NULL, updated_at = now()
 WHERE route = '/neet-pg-process'
   AND title = 'NEET PG Counselling Process 2026 — MCC & State, Round by Round';

SELECT route, title FROM page_seo WHERE route = '/neet-pg-process';
