-- Credit for the photographs behind the heroes.
--
-- The three hero images were AI-generated and carried real institutions' names:
-- "SWAMI VIVEKANANDA MEDICAL COLLEGE" with SCIENCES misspelt on the board,
-- "D.Y. PATIL MEDICAL COLLEGE", and an invented "ROYAL INTERNATIONAL MEDICAL
-- UNIVERSITY" on a Western campus. They are replaced with photographs of real
-- Indian medical colleges from Wikimedia, which are CC BY-SA — free to use and
-- conditional on crediting the photographer.
--
-- Same reasoning as migration 0019 for the college cards: a credit that lives
-- only in someone's notes is a condition nobody met.

ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS attribution text,
  ADD COLUMN IF NOT EXISTS license     text,
  ADD COLUMN IF NOT EXISTS source_url  text;
