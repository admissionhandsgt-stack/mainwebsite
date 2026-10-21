-- /md-ms-india's search description said "2.3 lakh published closing ranks across 2,168 colleges",
-- typed into page_seo on 2026-10-07. 2,168 is every row of our PG list — 1,536 of them DNB-only
-- hospitals — not a count of colleges, and both figures move with the data. Blank it, so the page's
-- own description (app/md-ms-india/page.tsx, NMC's count and the live closing-rank total) is used.
-- Guarded on the old text: an admin's own wording is left alone.
UPDATE page_seo
   SET description = NULL, updated_at = now()
 WHERE route = '/md-ms-india'
   AND description = 'NEET PG counselling for MD/MS, built on 2.3 lakh published closing ranks across 2,168 colleges. College predictor, round-by-round movement, choice filling.';

SELECT route, title, description FROM page_seo WHERE route = '/md-ms-india';
