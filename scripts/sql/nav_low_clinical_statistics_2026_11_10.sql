-- MD/MS → Cutoff & counselling (parent 83): the low score clinical branches page after Branch-wise Cutoff, and the
-- statistics page at the end (2026-11-10). Apply after the release that ships both pages. Idempotent: each row is
-- inserted once, and the rows below the first are moved down only on that first insert.
BEGIN;

WITH ins AS (
  INSERT INTO nav_items (menu, parent_id, label, url, description, display_order, is_active)
  SELECT 'header', 83, 'Low Score Clinical Branches', '/neet-pg-low-score-clinical-branches',
         'MD Medicine, Surgery, Ortho at a low rank: rank and score', 5, true
  WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE menu = 'header' AND url = '/neet-pg-low-score-clinical-branches')
  RETURNING id
)
UPDATE nav_items SET display_order = display_order + 1
 WHERE parent_id = 83 AND url IN ('/neet-pg-process', '/neet-pg-choice-filling')
   AND EXISTS (SELECT 1 FROM ins);

INSERT INTO nav_items (menu, parent_id, label, url, description, display_order, is_active)
SELECT 'header', 83, 'NEET PG Statistics 2026', '/neet-pg-statistics',
       'Candidates, MD/MS seats, MCC rounds in numbers', 8, true
 WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE menu = 'header' AND url = '/neet-pg-statistics');

SELECT label, url, display_order FROM nav_items WHERE parent_id = 83 ORDER BY display_order;

COMMIT;
