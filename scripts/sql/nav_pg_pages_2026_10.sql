-- Menu entries for the PG state and fee pages (2026-10-08). Same rule as
-- nav_search_pages_2026_10.sql: added only where the menu has no row for the URL.
BEGIN;
INSERT INTO nav_items (menu, label, url, parent_id, display_order, is_active)
SELECT v.menu, v.label, v.url, v.parent_id, v.display_order, true
  FROM (VALUES
    ('header', 'PG by State', '/md-ms-india/states', 6, 7),
    ('header', 'Private College PG Fees', '/md-ms-india/private-college-fees', 6, 8),
    ('header', 'Deemed University PG', '/md-ms-india/deemed-universities', 6, 9),
    ('footer_explore', 'PG Seats by State', '/md-ms-india/states', NULL, 10),
    ('footer_explore', 'Private PG Fees', '/md-ms-india/private-college-fees', NULL, 11)
  ) AS v(menu, label, url, parent_id, display_order)
 WHERE NOT EXISTS (SELECT 1 FROM nav_items n WHERE n.menu = v.menu AND n.url = v.url)
   AND (v.parent_id IS NULL OR EXISTS (SELECT 1 FROM nav_items p WHERE p.id = v.parent_id AND p.menu = 'header'));
COMMIT;
SELECT menu, label, url FROM nav_items WHERE url LIKE '/md-ms-india/%' ORDER BY menu, display_order;
