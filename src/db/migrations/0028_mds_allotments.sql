-- NEET MDS (dental PG) allotments, from MCC's published round results
-- (2026-10-08). MCC fills 50% All India Quota of government dental colleges
-- and 100% of deemed universities' seats. Kept apart from closing_ranks for the
-- same reason as ss_allotments: nothing in the MBBS/MD-MS predictor or the gate
-- should read dental PG seats by accident. Unlike SS, MDS results carry a quota
-- and an allotted category, so every range is stated per (quota, category).
--
-- Round 1 and stray rows are that round's allotments; later rounds carry that
-- round's new or upgraded allotments (and, in 2026, "Retained" holders).
-- Loaded by scripts/mds/build_mds_sql.py.

CREATE TABLE IF NOT EXISTS mds_allotments (
  id                 serial PRIMARY KEY,
  year               smallint NOT NULL,
  round              text     NOT NULL,
  rank               integer  NOT NULL,       -- NEET MDS All India Rank
  quota              text     NOT NULL,       -- MCC's label: "All India", "Management/Paid Seats Quota", …
  allotted_category  text     NOT NULL,       -- Open, OBC, SC, ST, EWS, and their PwD forms
  candidate_category text,
  institute          text     NOT NULL,
  state              text,
  institute_raw      text     NOT NULL,
  course             text     NOT NULL,
  course_slug        text     NOT NULL,
  remarks            text,
  source_pdf         text     NOT NULL,
  UNIQUE (year, round, rank)
);
CREATE INDEX IF NOT EXISTS mds_allotments_course ON mds_allotments (course_slug, year);
