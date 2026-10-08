-- Menu entries for the search pages added 2026-10-08. A page linked from every
-- page's header and footer is one Google treats as important — and sitelinks
-- are drawn from exactly those links. Idempotent: an entry is added only if no
-- row in that menu already points at the URL, so an admin's own edit or
-- removal of one is not undone by a re-run... unless they deleted the row, in
-- which case re-running puts it back; do not re-run after the team prunes.
--
-- Run: ora_psql < scripts/sql/nav_search_pages_2026_10.sql

BEGIN;

INSERT INTO nav_items (menu, label, url, parent_id, display_order, is_active)
SELECT v.menu, v.label, v.url, v.parent_id, v.display_order, true
  FROM (VALUES
    -- header: MBBS dropdown (id 2) and MD/MS dropdown (id 6)
    ('header', 'NEET UG Cutoff', '/neet-ug-cutoff', 2, 4),
    ('header', 'BDS Colleges', '/bds-india', 2, 5),
    ('header', 'NEET PG Cutoff', '/neet-pg-cutoff', 6, 5),
    ('header', 'PG Stipend by State', '/md-ms-india/stipend', 6, 6),
    -- footer: Explore
    ('footer_explore', 'NEET UG Cutoff', '/neet-ug-cutoff', NULL, 6),
    ('footer_explore', 'NEET PG Cutoff', '/neet-pg-cutoff', NULL, 7),
    ('footer_explore', 'BDS Colleges', '/bds-india', NULL, 8),
    ('footer_explore', 'PG Stipend by State', '/md-ms-india/stipend', NULL, 9)
  ) AS v(menu, label, url, parent_id, display_order)
 WHERE NOT EXISTS (SELECT 1 FROM nav_items n WHERE n.menu = v.menu AND n.url = v.url)
   AND (v.parent_id IS NULL OR EXISTS (SELECT 1 FROM nav_items p WHERE p.id = v.parent_id AND p.menu = 'header'));

COMMIT;

SELECT menu, parent_id, label, url FROM nav_items
 WHERE url IN ('/neet-ug-cutoff', '/neet-pg-cutoff', '/bds-india', '/md-ms-india/stipend')
 ORDER BY menu, parent_id, display_order;
