-- Menu rows for the pages of 2026-11-12 (the journey study; run after the release that serves them): documents, open
-- states, the in-service quota and the seat increase under MD/MS, and the counselling page under Know Us. Each is added
-- only if no menu row points at it yet, so a re-run adds nothing.
BEGIN;
INSERT INTO nav_items (menu, parent_id, label, url, description, display_order, is_active)
SELECT 'header', 83, 'Documents Required', '/neet-pg-documents', 'MCC''s and each state''s list, from the official brochures', 7, true
 WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/neet-pg-documents');
INSERT INTO nav_items (menu, parent_id, label, url, description, display_order, is_active)
SELECT 'header', 83, 'Open States', '/neet-pg-open-states', 'Which states take candidates from other states', 8, true
 WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/neet-pg-open-states');
INSERT INTO nav_items (menu, parent_id, label, url, description, display_order, is_active)
SELECT 'header', 83, 'In-Service Quota', '/neet-pg-in-service-quota', 'State by state, with each state''s rule', 9, true
 WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/neet-pg-in-service-quota');
INSERT INTO nav_items (menu, parent_id, label, url, description, display_order, is_active)
SELECT 'header', 82, 'Seat Increase 2026', '/neet-pg-seat-increase', 'Every seat MCC added, by branch and state', 6, true
 WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/neet-pg-seat-increase');
INSERT INTO nav_items (menu, parent_id, label, url, description, display_order, is_active)
SELECT 'header', p.id, 'Expert Counselling', '/counselling', 'Independent counsellors, every counselling in India', 0, true
  FROM nav_items p
 WHERE p.menu = 'header' AND p.parent_id IS NULL AND p.label = 'Know Us'
   AND NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/counselling')
 LIMIT 1;
COMMIT;
