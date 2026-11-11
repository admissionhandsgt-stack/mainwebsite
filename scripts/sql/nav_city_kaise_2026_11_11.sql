-- Menu rows for the city pages and the Hinglish counselling guide (2026-11-11; run after the release that serves them).
-- Each is added only if no menu row points at it yet, so a re-run adds nothing.
BEGIN;
INSERT INTO nav_items (menu, parent_id, label, url, description, display_order, is_active)
SELECT 'header', 82, 'Medical Colleges by City', '/medical-colleges', 'PG fees, MD/MS seats and stipend, city by city', 6, true
 WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/medical-colleges');
INSERT INTO nav_items (menu, parent_id, label, url, description, display_order, is_active)
SELECT 'header', 83, 'Counselling Kaise Hoti Hai (Hinglish)', '/neet-pg-counselling-kaise-hoti-hai', 'MCC aur state counselling, aasan bhasha me', 9, true
 WHERE NOT EXISTS (SELECT 1 FROM nav_items WHERE url = '/neet-pg-counselling-kaise-hoti-hai');
COMMIT;
