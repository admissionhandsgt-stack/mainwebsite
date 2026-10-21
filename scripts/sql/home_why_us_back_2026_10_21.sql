-- "Why families trust Admission Hands" back on the homepage (owner, 2026-10-21: "why trust us section
-- aana chahiye"), after how it works and before the enquiry form, and its two typed figures replaced by
-- live ones: {closing_ranks_lakh} (filled in app/page.tsx from lib/liveFigures.ts) and {students} (the
-- team's own figure, Admin → "Site: the team's own figures"). Run after the release that fills them.
-- Each point changes only while it still holds the seeded words. Re-runnable.

BEGIN;

UPDATE page_sections SET is_visible = true, updated_at = now()
 WHERE page = 'home' AND section_key = 'why_us' AND NOT is_visible;

UPDATE page_sections p SET display_order = v.ord, updated_at = now()
  FROM (VALUES ('hero', 1), ('services', 2), ('how_it_works', 3), ('why_us', 4), ('enquiry', 5),
               ('counsellor_edge', 6), ('testimonials', 7), ('trust', 8), ('telegram', 9)) AS v(key, ord)
 WHERE p.page = 'home' AND p.section_key = v.key;

UPDATE site_settings s SET value = v.new, updated_at = now()
  FROM (VALUES
          ('home.why.point_1', '2.7 Lakh Closing Ranks', '{closing_ranks_lakh} published closing ranks'),
          ('home.why.point_2', '2100+ Families Guided', '{students} families guided'),
          ('home.why.point_3', 'Pan-India Coverage', 'Pan-India coverage'),
          ('home.why.point_4', 'Zero Hidden Fees', 'Zero hidden fees')
       ) AS v(key, old, new)
 WHERE s.key = v.key AND s.value = v.old;

COMMIT;

SELECT section_key, display_order, is_visible FROM page_sections WHERE page = 'home' ORDER BY is_visible DESC, display_order;
SELECT key, value FROM site_settings WHERE key LIKE 'home.why.point_%' ORDER BY key;
