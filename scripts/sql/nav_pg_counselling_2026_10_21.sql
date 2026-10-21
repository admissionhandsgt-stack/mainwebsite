-- Menu entry for the NEET PG counselling pages (2026-10-21): each round's result, built by itself
-- from MCC's PDF. In the MD/MS dropdown (header id 6) right after "NEET PG Process", and in the
-- footer's Explore list. The year is in the URL and the label: change both when the next
-- counselling starts. Idempotent like nav_seat_matrix_bond_2026_10_20.sql — a row is added only
-- if its menu has none pointing at a /neet-pg-counselling URL yet.
--
-- Run after the deploy that ships the pages: ora_psql < scripts/sql/nav_pg_counselling_2026_10_21.sql

BEGIN;

-- Make room after "NEET PG Process" (2) in the MD/MS dropdown.
UPDATE nav_items SET display_order = display_order + 1
 WHERE menu = 'header' AND parent_id = 6 AND display_order > 2
   AND NOT EXISTS (SELECT 1 FROM nav_items n WHERE n.menu = 'header' AND n.url LIKE '/neet-pg-counselling%');

INSERT INTO nav_items (menu, label, url, parent_id, display_order, is_active)
SELECT v.menu, v.label, v.url, v.parent_id, v.display_order, true
  FROM (VALUES
    ('header', 'NEET PG Counselling 2026', '/neet-pg-counselling/2026', 6, 3),
    ('footer_explore', 'NEET PG Counselling 2026', '/neet-pg-counselling/2026', NULL, 17)
  ) AS v(menu, label, url, parent_id, display_order)
 WHERE NOT EXISTS (SELECT 1 FROM nav_items n WHERE n.menu = v.menu AND n.url LIKE '/neet-pg-counselling%')
   AND (v.parent_id IS NULL OR EXISTS (SELECT 1 FROM nav_items p WHERE p.id = v.parent_id AND p.menu = 'header'));

COMMIT;

SELECT menu, parent_id, display_order, label, url FROM nav_items
 WHERE (menu = 'header' AND parent_id = 6) OR url LIKE '/neet-pg-counselling%'
 ORDER BY menu, parent_id, display_order;
