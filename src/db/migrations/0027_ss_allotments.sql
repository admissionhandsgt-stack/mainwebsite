-- NEET SS (DM / MCh / DrNB) allotments, from MCC's published round results
-- (2026-10-08). Kept apart from closing_ranks on purpose: SS has no quota or
-- category column at all (open merit within each group's own rank list), its
-- own rank lists per group, and nothing in the predictor or the gate should
-- start reading it by accident through a shared table.
--
-- One row per seat allotted in a round. Round 1 rows are every seat holder;
-- later rounds carry only that round's new allotments (fresh or upgraded), so
-- "how far did the list go" for a seat is the max rank across a year's rounds.
-- Loaded by scripts/ss/build_ss_sql.py.

CREATE TABLE IF NOT EXISTS ss_allotments (
  id            serial PRIMARY KEY,
  year          smallint NOT NULL,          -- the NEET SS session (SS 2024 ran in 2025)
  round         text     NOT NULL,          -- R1, R2, STRAY, MOPUP
  rank          integer  NOT NULL,          -- rank within the group's own merit list
  grp           text     NOT NULL,          -- "MEDICAL GROUP", "SURGICAL GROUP", …
  institute     text     NOT NULL,          -- name: the first segment of MCC's address cell
  state         text,
  institute_raw text     NOT NULL,
  course        text     NOT NULL,          -- normalised: "DM Cardiology", "MCh Neuro Surgery", "DrNB …"
  course_slug   text     NOT NULL,
  remarks       text,
  source_pdf    text     NOT NULL,
  UNIQUE (year, round, grp, rank)
);
CREATE INDEX IF NOT EXISTS ss_allotments_course ON ss_allotments (course_slug, year);
CREATE INDEX IF NOT EXISTS ss_allotments_year ON ss_allotments (year, round);
