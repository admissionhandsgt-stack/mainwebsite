-- What the photograph actually shows.
--
-- Migration 0020 recorded who took each hero photograph, because CC BY-SA
-- requires it. This records *which college it is*, which the licence does not
-- require and this site does.
--
-- The heroes are backdrops: the deemed-universities page rotates four campuses
-- behind the heading "India's Finest Deemed Universities", and three of them are
-- government colleges. A backdrop that is left unnamed under a heading like that
-- invites the reader to attach the heading to the building — which is the same
-- fault as the AI-generated images these replaced, arrived at by omission
-- instead of invention. Naming the college in the credit line costs one column
-- and closes it.
--
-- `alt_text` is deliberately not reused: that is the accessible description and
-- the admin edits it for screen readers, not for a visible caption.

ALTER TABLE media_assets
  ADD COLUMN IF NOT EXISTS subject text;
