-- The homepage, compact (owner, 2026-10-21: "home page kuch jyada bada nahi ho gaya… kafi lamba bada
-- homepage hogya hai"). 13 sections and 10,683px on a laptop (19,586px on a phone) → 8 sections.
--
-- Hidden, not deleted — each can be switched back on in Admin → Content → Page layout:
--   data_insights   dark band of typed figures ("45% : 55%") — the MBBS page holds the real ones
--   top_institutes  four colleges shown as initials ("MAM", "KGS"), each "250 seats"
--   cta_band        a second call to action saying what the enquiry form says
--   why_us          the case the trust block and the counsellor card already make
--   videos          910px of embeds — /videos has them all
-- The counsellor card and the trust block (compact versions on the homepage) get rows of their own,
-- so the admin can order and hide them like the rest. Re-runnable.

BEGIN;

UPDATE page_sections SET is_visible = false, updated_at = now()
 WHERE page = 'home' AND section_key IN ('data_insights', 'top_institutes', 'cta_band', 'why_us', 'videos') AND is_visible;

INSERT INTO page_sections (page, section_key, label, description, display_order, is_visible)
SELECT 'home', v.key, v.label, v.descr, v.ord, true
  FROM (VALUES
          ('counsellor_edge', 'The difference a counsellor makes', 'Counted facts from the counselling results, and the calls a counsellor makes', 5),
          ('trust', 'Trust and fraud warnings', 'Years of counselling, what a family can verify, and six signs of a fraud agent', 7)
       ) AS v(key, label, descr, ord)
 WHERE NOT EXISTS (SELECT 1 FROM page_sections p WHERE p.page = 'home' AND p.section_key = v.key);

-- Order: hero, the paths, how admission works, the enquiry, the counsellor card, stories, trust, Telegram.
UPDATE page_sections p SET display_order = v.ord, updated_at = now()
  FROM (VALUES ('hero', 1), ('services', 2), ('how_it_works', 3), ('enquiry', 4), ('counsellor_edge', 5),
               ('testimonials', 6), ('trust', 7), ('telegram', 8)) AS v(key, ord)
 WHERE p.page = 'home' AND p.section_key = v.key;

COMMIT;

SELECT section_key, display_order, is_visible FROM page_sections WHERE page = 'home' ORDER BY is_visible DESC, display_order;
