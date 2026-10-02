-- Take the stock photographs off the colleges.
--
-- `pg_colleges_content` carried six Unsplash URLs rotated across 251 colleges —
-- about forty-two colleges each. So a candidate reading Lokmanya Tilak
-- Municipal Medical College saw a building that is not it, under its name, as
-- though it were. That is the same fault as a fee printed beside the wrong
-- rank: harmless arithmetic, completely untrue, and worse than showing nothing
-- on a site whose claim is that the facts are the authority's own.
--
-- One more goes with them: Agartala Government Medical College carried an
-- upload named `indian_doctors.png`. Somebody chose it, so it is called out
-- rather than quietly dropped — but a stock photograph of doctors is not a
-- photograph of that college, and the rule has to be the same for an upload as
-- for a hotlink.
--
-- **Three images are deliberately kept.** The deemed colleges carry uploads
-- whose filenames name the institution — `bharti-vidyapeeth-pune`,
-- `jnmc-kle-belgaum`, `dy-patil-dypu-pune`. Somebody curated those properly and
-- they are what the right answer looks like.
--
-- ## Why this is not replaced with sourced photographs
--
-- It was attempted and measured. Wikipedia was searched for twenty-five of
-- these colleges: ten appeared to match and **four actually did**. "Shimoga
-- Institute of Medical Sciences" matched the article for the town of Shimoga.
-- "Kalpana Chawla Government Medical College" matched the astronaut. Sixteen
-- percent coverage where every near-miss is a confident lie is not a source.
--
-- `CollegeVisual` draws a monogram from the college's own name instead, which
-- is deterministic, claims nothing, and reads as an identity rather than as a
-- missing image. A real photograph still wins wherever `image_url` holds one,
-- so curating them one at a time through the admin remains the way forward.
--
-- Reversible: the old values are kept.

CREATE TABLE IF NOT EXISTS removed_college_images (
  id          serial PRIMARY KEY,
  source      text        NOT NULL,
  row_id      integer     NOT NULL,
  college_name text,
  image_url   text        NOT NULL,
  removed_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO removed_college_images (source, row_id, college_name, image_url)
SELECT 'pg_colleges_content', id, college_name, image_url
  FROM pg_colleges_content
 WHERE image_url IS NOT NULL
   AND (image_url LIKE '%unsplash%' OR image_url LIKE '%indian_doctors%');

UPDATE pg_colleges_content
   SET image_url = NULL
 WHERE image_url IS NOT NULL
   AND (image_url LIKE '%unsplash%' OR image_url LIKE '%indian_doctors%');

-- Nothing else carried one, but the same rule applies wherever one appears.
INSERT INTO removed_college_images (source, row_id, college_name, image_url)
SELECT 'ug_all_colleges', id, college_name, image_url
  FROM ug_all_colleges
 WHERE image_url LIKE '%unsplash%';

UPDATE ug_all_colleges SET image_url = NULL WHERE image_url LIKE '%unsplash%';

INSERT INTO removed_college_images (source, row_id, college_name, image_url)
SELECT 'deemed_colleges', id, college_name, image_url
  FROM deemed_colleges
 WHERE image_url LIKE '%unsplash%';

UPDATE deemed_colleges SET image_url = NULL WHERE image_url LIKE '%unsplash%';
