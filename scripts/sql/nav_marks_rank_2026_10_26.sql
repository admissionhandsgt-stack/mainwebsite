-- NEET PG marks vs rank in MD/MS → Cutoff & counselling (after the release that ships the page).
-- Idempotent: inserts once, and moves the two rows below it down only on that first insert.
BEGIN;

WITH ins AS (
  INSERT INTO nav_items (menu, parent_id, label, url, description, display_order, is_active)
  SELECT 'header', 83, 'NEET PG Marks vs Rank', '/neet-pg-marks-vs-rank',
         'Your score, the rank it held, the branches it reached', 3, true
  WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE menu = 'header' AND url = '/neet-pg-marks-vs-rank')
  RETURNING id
)
UPDATE nav_items SET display_order = display_order + 1
 WHERE parent_id = 83 AND url IN ('/md-ms-india/branches', '/neet-pg-process')
   AND EXISTS (SELECT 1 FROM ins);

SELECT label, url, display_order FROM nav_items WHERE parent_id = 83 ORDER BY display_order;

COMMIT;
