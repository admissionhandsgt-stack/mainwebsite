-- AYUSH colleges in the MBBS menu and footer (2026-10-09): their 162 pages were orphans. Idempotent.
BEGIN;
INSERT INTO nav_items (menu, label, url, parent_id, display_order, is_active)
SELECT v.menu, v.label, v.url, v.parent_id, v.display_order, true
  FROM (VALUES
    ('header', 'BAMS & AYUSH Colleges', '/ayush-colleges', 2, 7),
    ('footer_explore', 'BAMS & AYUSH Colleges', '/ayush-colleges', NULL, 14)
  ) AS v(menu, label, url, parent_id, display_order)
 WHERE NOT EXISTS (SELECT 1 FROM nav_items n WHERE n.menu = v.menu AND n.url = v.url)
   AND (v.parent_id IS NULL OR EXISTS (SELECT 1 FROM nav_items p WHERE p.id = v.parent_id AND p.menu = 'header'));
COMMIT;
