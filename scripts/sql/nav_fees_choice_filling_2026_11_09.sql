-- MD/MS menu (after the release that ships the pages, 2026-11-09):
--   Fees, stipend & bond (84) → "PG Fees by State" /md-ms-india/fees, first in the column
--   Cutoff & counselling (83) → "Choice Filling & Free Exit" /neet-pg-choice-filling, after NEET PG Process
-- Idempotent: inserts once; moves the fee column's rows down only on that first insert.
BEGIN;

WITH ins AS (
  INSERT INTO nav_items (menu, parent_id, label, url, description, display_order, is_active)
  SELECT 'header', 84, 'PG Fees by State', '/md-ms-india/fees',
         'Govt, private and deemed MD/MS fees, college by college', 1, true
  WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE menu = 'header' AND url = '/md-ms-india/fees')
  RETURNING id
)
UPDATE nav_items SET display_order = display_order + 1
 WHERE parent_id = 84 AND url <> '/md-ms-india/fees' AND EXISTS (SELECT 1 FROM ins);

INSERT INTO nav_items (menu, parent_id, label, url, description, display_order, is_active)
SELECT 'header', 83, 'Choice Filling & Free Exit', '/neet-pg-choice-filling',
       'Locking, Freeze vs Float, upgradation, free exit', 6, true
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE menu = 'header' AND url = '/neet-pg-choice-filling');

-- /md-ms-india/fees held "MD/MS Fees vs Stipend" (seeded 2026-09-22, the page it 308ed away from); page_seo wins over
-- the page's own title, so blank it — only while it still holds that seeded text.
UPDATE page_seo SET title = NULL, page_label = 'PG Fees by State'
 WHERE route = '/md-ms-india/fees' AND title = 'MD/MS Fees vs Stipend | AdmissionHands';

SELECT parent_id, label, url, display_order FROM nav_items WHERE parent_id IN (83, 84) ORDER BY parent_id, display_order;

COMMIT;
