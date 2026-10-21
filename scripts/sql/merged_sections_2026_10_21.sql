-- Merged sections, nothing hidden (owner, 2026-10-21: "do it properly — no regression, and no information
-- hidden"). Run AFTER the release that renders the merged sections: on the release before it, switching
-- these rows on brings back the old dark sections instead.
--
--   mbbs / counselling + seats   one section; every goal strategy printed (it sat behind "Learn strategy")
--   mbbs / why_us                back on — its four points sit under the selection guide's four phases
--   pg / overview + quota + cutoffs   one section; the quota cards (switched off this morning) are back
--                                     inside it, beside the AIQ-vs-state parameter table
--   pg / colleges                stays off: its cards were typed seat counts ("100", "110", "120") and
--                                one-line blurbs; the PG directory lists NMC's figures for every college
--
-- A label or description changes only while it still holds the seeded words. Re-runnable.

BEGIN;

UPDATE page_sections SET is_visible = true, updated_at = now()
 WHERE NOT is_visible AND ((page = 'mbbs' AND section_key = 'why_us') OR (page = 'pg' AND section_key = 'quota'));

UPDATE page_sections p SET label = v.label, description = v.descr, updated_at = now()
  FROM (VALUES
          ('mbbs', 'counselling', 'Counselling system', 'AIQ, state and deemed explained',
           'Counselling system & seat matrix',
           'AIQ, state, private and management quotas with the goal strategy for each, beside the seat matrix — one section'),
          ('mbbs', 'seats', 'Seat distribution', 'How the seat matrix splits',
           'Seat distribution',
           'Seat counts and top states, printed beside the counselling system (on their own when that row is off)'),
          ('mbbs', 'why_us', 'Why Admission Hands', 'The differentiators block',
           'Why Admission Hands',
           'Four reasons students trust us, printed under the selection guide''s four phases'),
          ('pg', 'overview', 'Overview', 'What NEET PG counselling involves',
           'Overview, quotas & parameters',
           'The six overview cards, then the quota cards beside the AIQ-vs-state parameter table — one section'),
          ('pg', 'quota', 'Quota system', 'AIQ vs state quota explained',
           'Quota cards',
           'AIQ, state and deemed seat shares, printed inside the overview section'),
          ('pg', 'cutoffs', 'Cutoff insights', 'How closing ranks have moved',
           'Counselling parameters',
           'The AIQ-vs-state parameter table, printed inside the overview section')
       ) AS v(page, key, old_label, old_descr, label, descr)
 WHERE p.page = v.page AND p.section_key = v.key AND p.label = v.old_label AND p.description = v.old_descr;

COMMIT;

SELECT page, section_key, label, is_visible FROM page_sections WHERE page IN ('mbbs', 'pg') ORDER BY page, display_order;
