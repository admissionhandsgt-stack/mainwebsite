-- Where a college photograph came from, and under what licence.
--
-- Photographs are being sourced from Wikimedia, where almost everything is
-- CC BY-SA or CC BY. Those licences are free to use commercially and they are
-- **conditional**: the author has to be credited and the licence named. A
-- credit we did not record is a credit we cannot display, so the attribution is
-- stored beside the image rather than left to be looked up later.
--
-- `image_source_url` is the Wikipedia article the image was taken from, which
-- is also the audit trail: anybody can open it and check that the photograph
-- belongs to the college it is attached to.
--
-- Nullable throughout. An image an admin uploads — the college's own photograph,
-- sent by the college — carries no Wikimedia attribution and needs none.

ALTER TABLE pg_colleges_content
  ADD COLUMN IF NOT EXISTS image_attribution text,
  ADD COLUMN IF NOT EXISTS image_license     text,
  ADD COLUMN IF NOT EXISTS image_source_url  text;

ALTER TABLE ug_all_colleges
  ADD COLUMN IF NOT EXISTS image_attribution text,
  ADD COLUMN IF NOT EXISTS image_license     text,
  ADD COLUMN IF NOT EXISTS image_source_url  text;

ALTER TABLE deemed_colleges
  ADD COLUMN IF NOT EXISTS image_attribution text,
  ADD COLUMN IF NOT EXISTS image_license     text,
  ADD COLUMN IF NOT EXISTS image_source_url  text;
