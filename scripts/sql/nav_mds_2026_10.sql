-- NEET MDS in the menus (2026-10-08), beside BDS. Same idempotent rule as the others.
BEGIN;
INSERT INTO nav_items (menu, label, url, parent_id, display_order, is_active)
SELECT v.menu, v.label, v.url, v.parent_id, v.display_order, true
  FROM (VALUES
    ('header', 'NEET MDS Cutoff', '/neet-mds-cutoff', 2, 6),
    ('footer_explore', 'NEET MDS Cutoff', '/neet-mds-cutoff', NULL, 13)
  ) AS v(menu, label, url, parent_id, display_order)
 WHERE NOT EXISTS (SELECT 1 FROM nav_items n WHERE n.menu = v.menu AND n.url = v.url)
   AND (v.parent_id IS NULL OR EXISTS (SELECT 1 FROM nav_items p WHERE p.id = v.parent_id AND p.menu = 'header'));
COMMIT;
