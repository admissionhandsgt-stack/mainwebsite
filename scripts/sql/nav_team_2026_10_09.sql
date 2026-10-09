-- Footer link to /team (added 2026-10-09). Idempotent.
INSERT INTO nav_items (menu, label, url, parent_id, display_order, is_active, opens_new_tab)
SELECT 'footer_quick', 'Our Team', '/team', NULL, 6, true, false
WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE menu = 'footer_quick' AND url = '/team');
