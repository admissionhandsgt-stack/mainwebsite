-- MCC's "newly added seats" notices, read by themselves (2026-11-10; owner: "mostly data dynamic hona chaiye, static nhi").
-- MCC adds seats between rounds as a PDF (Round 2, 10 Nov 2026: 3,657). The mcc-worker container spots the notice on
-- MCC's PG pages, reads the PDF (pdfplumber), checks the rows add up to the total MCC prints, and stages them here; the
-- app (lib/mccAddedSeats.ts) maps them into mcc_seat_matrix and refreshes the pages. Same least-privilege shape as the
-- round results: the worker writes only these two tables.

CREATE TABLE IF NOT EXISTS mcc_added_seat_files (
  url            text PRIMARY KEY,
  year           integer NOT NULL,
  title          text NOT NULL,
  status         text NOT NULL DEFAULT 'detected',   -- detected | parsing | staged | live | parse_failed | error
  rows           integer,
  seats          integer,                            -- seats in the rows read
  printed_total  integer,                            -- the total MCC prints at the end of the PDF
  imported       integer,                            -- seats the app put into mcc_seat_matrix (AFMS left out)
  error          text,
  detected_at    timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mcc_added_seats_staging (
  url        text NOT NULL,
  state      text,
  inst_type  text,
  institute  text NOT NULL,
  code       text,
  quota      text NOT NULL,
  branch     text NOT NULL,
  category   text NOT NULL,      -- "OP NO", "BC PH" … as MCC prints it
  seats      integer NOT NULL
);
CREATE INDEX IF NOT EXISTS mcc_added_seats_staging_url ON mcc_added_seats_staging (url);

-- Round 2's notice of 10 Nov 2026 was imported by hand the same day (scripts/mcc/README_added_seats.md): on record, so
-- the worker does not read it again.
INSERT INTO mcc_added_seat_files (url, year, title, status, rows, seats, printed_total, imported)
VALUES ('https://cdnbbsr.s3waas.gov.in/s3e0f7a4d0ef9b84b83b693bbf3feb8e6e/uploads/2026/11/202611101718716060.pdf', 2026,
        'NEWLY ADDED SEATS ROUND 2 (MD/MS/DNB) – PG COUNSELLING 2026', 'live', 2440, 3657, 3657, 3534)
ON CONFLICT (url) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'mcc_worker') THEN
    GRANT SELECT, INSERT, UPDATE ON mcc_added_seat_files TO mcc_worker;
    GRANT SELECT, INSERT, DELETE ON mcc_added_seats_staging TO mcc_worker;
  END IF;
END $$;
