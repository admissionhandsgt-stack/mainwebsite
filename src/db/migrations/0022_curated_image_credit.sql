-- The photo credit on every curated college table, not only some of them.
--
-- Migration 0019 added image_attribution / image_license to ug_all_colleges,
-- pg_colleges_content and deemed_colleges. getCuratedColleges() then started
-- selecting both columns for every curated table it reads — and
-- ug_recommended_colleges, which feeds the homepage's "Top Medical Institutes",
-- had neither. Every homepage request failed that query; safe() turned the
-- failure into an empty list, and the section quietly stopped rendering in
-- production: 1,084 "Failed query" log lines in six hours, and no status code
-- anywhere that was not 200.
--
-- Additive and idempotent. The two PG curated tables carry image_url too and get
-- the columns for the same reason, before anything starts selecting them.

ALTER TABLE ug_recommended_colleges
  ADD COLUMN IF NOT EXISTS image_attribution text,
  ADD COLUMN IF NOT EXISTS image_license     text;

ALTER TABLE pg_recommended_colleges
  ADD COLUMN IF NOT EXISTS image_attribution text,
  ADD COLUMN IF NOT EXISTS image_license     text;

ALTER TABLE pg_deemed_colleges
  ADD COLUMN IF NOT EXISTS image_attribution text,
  ADD COLUMN IF NOT EXISTS image_license     text;
