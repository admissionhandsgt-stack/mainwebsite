-- Menu entries for the two PG pages added 2026-10-20: MCC's NEET PG seat matrix and the
-- service bond by state. Placed in the MD/MS dropdown (header id 6) after "NEET PG Cutoff",
-- and in the footer's Explore list. Idempotent in the same way as nav_search_pages_2026_10.sql:
-- a row is added only if that menu has no row pointing at the URL yet, so re-running does not
-- duplicate — but it would put back a row the team deleted, so do not re-run after a prune.
--
-- Run: ora_psql < scripts/sql/nav_seat_matrix_bond_2026_10_20.sql

BEGIN;

-- Make room after "NEET PG Cutoff" (5) in the MD/MS dropdown.
UPDATE nav_items SET display_order = display_order + 2
 WHERE menu = 'header' AND parent_id = 6 AND display_order > 5
   AND NOT EXISTS (SELECT 1 FROM nav_items n WHERE n.menu = 'header' AND n.url = '/neet-pg-seat-matrix');

INSERT INTO nav_items (menu, label, url, parent_id, display_order, is_active)
SELECT v.menu, v.label, v.url, v.parent_id, v.display_order, true
  FROM (VALUES
    ('header', 'NEET PG Seat Matrix', '/neet-pg-seat-matrix', 6, 6),
    ('header', 'PG Bond by State', '/md-ms-india/bond', 6, 7),
    ('footer_explore', 'NEET PG Seat Matrix', '/neet-pg-seat-matrix', NULL, 15),
    ('footer_explore', 'PG Bond by State', '/md-ms-india/bond', NULL, 16)
  ) AS v(menu, label, url, parent_id, display_order)
 WHERE NOT EXISTS (SELECT 1 FROM nav_items n WHERE n.menu = v.menu AND n.url = v.url)
   AND (v.parent_id IS NULL OR EXISTS (SELECT 1 FROM nav_items p WHERE p.id = v.parent_id AND p.menu = 'header'));

COMMIT;

SELECT menu, parent_id, display_order, label, url FROM nav_items
 WHERE (menu = 'header' AND parent_id = 6) OR url IN ('/neet-pg-seat-matrix', '/md-ms-india/bond')
 ORDER BY menu, parent_id, display_order;
