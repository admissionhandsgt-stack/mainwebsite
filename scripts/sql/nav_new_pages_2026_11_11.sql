-- Menu rows for the pages of 2026-11-11 (run after the release that serves them): the counselling updates hub, MD vs
-- DNB and the new medical colleges list. Each is added only if no menu row points at it yet, so a re-run adds nothing.
BEGIN;
INSERT INTO nav_items (menu, parent_id, label, url, description, display_order, is_active)
SELECT 'header', 83, 'Counselling Updates', '/neet-counselling-updates', 'MCC and state notices, newest first', 0, true
 WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/neet-counselling-updates');
INSERT INTO nav_items (menu, parent_id, label, url, description, display_order, is_active)
SELECT 'header', 82, 'MD vs DNB', '/md-vs-dnb', 'Seats, cut off, stipend and fee compared', 5, true
 WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/md-vs-dnb');
INSERT INTO nav_items (menu, parent_id, label, url, description, display_order, is_active)
SELECT 'header', 2, 'New Medical Colleges 2026', '/mbbs-india/new-medical-colleges', 'NMC''s list for this year, state wise', 5, true
 WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/mbbs-india/new-medical-colleges');
COMMIT;
