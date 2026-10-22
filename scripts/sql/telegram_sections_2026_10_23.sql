-- The Telegram channel higher on the pages that carry it (owner, 2026-10-23: "telegram promote hona chahiye").
-- Run AFTER the release that renders the `telegram` section on the MBBS, MD/MS and NRI pages (before it, a row
-- for a section the code does not draw does nothing; the code without a row draws it last). Re-runnable: a page
-- that already has its row is left alone. Each row can be moved or switched off in Admin → Content → Page layout.
--
--   home   the Telegram band straight after the enquiry form (it was the last section)
--   mbbs   after "Counselling system & seat matrix"
--   pg     after "Overview, quotas & parameters"
--   nri    after the admission process

BEGIN;

-- Home: enquiry, then Telegram, then the rest in their order.
UPDATE page_sections p SET display_order = v.ord, updated_at = now()
  FROM (VALUES ('hero', 1), ('services', 2), ('how_it_works', 3), ('why_us', 4), ('enquiry', 5), ('telegram', 6),
               ('counsellor_edge', 7), ('testimonials', 8), ('trust', 9)) AS v(key, ord)
 WHERE p.page = 'home' AND p.section_key = v.key;

-- MBBS, MD/MS and NRI: make room after the section named, then add the row.
UPDATE page_sections s SET display_order = s.display_order + 1, updated_at = now()
  FROM (VALUES ('mbbs', 'counselling'), ('pg', 'overview'), ('nri', 'process')) AS v(page, after_key)
 WHERE s.page = v.page
   AND s.display_order > (SELECT a.display_order FROM page_sections a WHERE a.page = v.page AND a.section_key = v.after_key)
   AND NOT EXISTS (SELECT 1 FROM page_sections t WHERE t.page = v.page AND t.section_key = 'telegram');

INSERT INTO page_sections (page, section_key, label, description, display_order, is_visible)
SELECT v.page, 'telegram', 'Telegram channel', 'The invite to the Telegram channel for counselling updates and round results',
       (SELECT a.display_order FROM page_sections a WHERE a.page = v.page AND a.section_key = v.after_key) + 1, true
  FROM (VALUES ('mbbs', 'counselling'), ('pg', 'overview'), ('nri', 'process')) AS v(page, after_key)
 WHERE NOT EXISTS (SELECT 1 FROM page_sections t WHERE t.page = v.page AND t.section_key = 'telegram');

COMMIT;

SELECT page, section_key, display_order, is_visible FROM page_sections
 WHERE page IN ('home', 'mbbs', 'pg', 'nri') AND is_visible ORDER BY page, display_order;
