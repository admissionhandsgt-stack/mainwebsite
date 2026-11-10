-- Admin → Content → Sections & lists: "Low rank clinical: students' seats" (2026-11-10). Real students only, entered by the
-- team with the student's permission: title = the seat (branch, college type, state), subtitle = rank and category
-- ("AIR 1,18,402 · General · 2025"), body = what the counsellor did, data.round, data.student (initials and city).
-- /neet-pg-low-score-clinical-branches shows the section only when a row exists. Idempotent; no rows are added here.
INSERT INTO content_collections (slug, label, description, fields, display_order)
SELECT 'low_rank_cases',
       'Low rank clinical: students'' seats',
       'Real students only, with their permission. Title = the seat (e.g. "MD General Medicine, deemed university, Karnataka"); subtitle = rank, category and year (e.g. "AIR 1,18,402 · General · 2025"); body = what we did; round = the round it came in; student = initials and city. Never a promise; never invented.',
       to_jsonb('["title","subtitle","body","data.round","data.student"]'::text),
       (SELECT COALESCE(MAX(display_order), 0) + 1 FROM content_collections)
 WHERE NOT EXISTS (SELECT 1 FROM content_collections WHERE slug = 'low_rank_cases');
SELECT slug, label, fields FROM content_collections WHERE slug = 'low_rank_cases';
