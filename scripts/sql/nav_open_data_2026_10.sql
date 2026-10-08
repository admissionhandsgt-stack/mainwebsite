-- Open data and the stipend report in the footer (2026-10-08). Idempotent.
BEGIN;
INSERT INTO nav_items (menu, label, url, parent_id, display_order, is_active)
SELECT v.menu, v.label, v.url, NULL, v.display_order, true
  FROM (VALUES
    ('footer_quick', 'Open Data', '/data', 9),
    ('footer_quick', 'PG Stipend Report 2026', '/reports/neet-pg-stipend-2026', 10)
  ) AS v(menu, label, url, display_order)
 WHERE NOT EXISTS (SELECT 1 FROM nav_items n WHERE n.menu = v.menu AND n.url = v.url);
COMMIT;
