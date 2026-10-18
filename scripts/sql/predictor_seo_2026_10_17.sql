-- The predictor's title and description now come from code, with the year
-- taken from the data (src/app/neet-college-predictor/page.tsx). The admin row
-- hardcoded "2026"; blanking it lets the shipped copy through (a blank admin
-- field falls back to the page's own). Guarded on the old value, so an edit
-- somebody made in the admin is never overwritten.
UPDATE page_seo
   SET title = '', updated_at = now()
 WHERE route = '/neet-college-predictor'
   AND title = 'NEET College Predictor 2026 — MBBS, BDS & MD/MS by Rank';

UPDATE page_seo
   SET description = '', updated_at = now()
 WHERE route = '/neet-college-predictor'
   AND description LIKE 'Enter your NEET rank and see the colleges it reaches — MBBS, BDS and M%';

SELECT route, title, left(description, 60) AS description FROM page_seo WHERE route = '/neet-college-predictor';
