-- NEET SS pages in the menus (2026-10-08). Under MD/MS: a new top-level header
-- item would break the header's width budget (CLAUDE.md).
BEGIN;
INSERT INTO nav_items (menu, label, url, parent_id, display_order, is_active)
SELECT v.menu, v.label, v.url, v.parent_id, v.display_order, true
  FROM (VALUES
    ('header', 'NEET SS (DM/MCh) Cutoff', '/neet-ss-cutoff', 6, 10),
    ('footer_explore', 'NEET SS Cutoff', '/neet-ss-cutoff', NULL, 12)
  ) AS v(menu, label, url, parent_id, display_order)
 WHERE NOT EXISTS (SELECT 1 FROM nav_items n WHERE n.menu = v.menu AND n.url = v.url)
   AND (v.parent_id IS NULL OR EXISTS (SELECT 1 FROM nav_items p WHERE p.id = v.parent_id AND p.menu = 'header'));
COMMIT;
