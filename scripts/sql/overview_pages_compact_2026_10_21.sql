-- The MD/MS and MBBS overview pages, compact (owner, 2026-10-21: "aur bhi kafi sections hai jo abhi
-- professional nahi lagre aur compact kie ja sakte hai"). Hidden, not deleted — each can be switched back
-- on in Admin → Content → Page layout. Re-runnable.
--
--   pg / quota      the dark "Understanding PG seat distribution" band; "Counselling process parameters"
--                   (cutoffs) on the same page sets out the All India Quota against the state quota in full
--   pg / colleges   a paged grid of 300+ colleges, half of them as initials — the PG colleges directory
--                   (/md-ms-india/colleges) is the real list, one click from the hero and the menu
--   mbbs / why_us   "Why students trust Admission Hands", beside "How we help you secure the best MBBS
--                   seat" (selection_guide), which makes the same case

UPDATE page_sections SET is_visible = false, updated_at = now()
 WHERE is_visible AND ((page = 'pg' AND section_key IN ('quota', 'colleges')) OR (page = 'mbbs' AND section_key = 'why_us'));

SELECT page, section_key, display_order, is_visible FROM page_sections WHERE page IN ('pg', 'mbbs') ORDER BY page, display_order;
