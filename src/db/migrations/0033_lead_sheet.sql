-- The counsellors' Google Sheet, follow-up reminders and the morning digest (2026-10-16).
--
-- The sheet shows one row per student per course (phone + tab), however many
-- times they used the tools; `leads` keeps one row per enquiry, as before.
-- The team's fields (status, counsellor, follow-up, notes, call outcome) are
-- the same on every enquiry from one number — the sync keeps them that way.

-- A follow-up has a time as well as a date now, so a reminder can fire at it.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_time text;          -- "4:30 PM", IST
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_reminded_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS call_outcome text;

-- One row per student in the sheet: where they are, and what the sheet said
-- last time we looked, which is how a counsellor's edit is told apart from an
-- admin's (whichever side moved since the snapshot is the one that changed).
CREATE TABLE IF NOT EXISTS sheet_people (
  tab             text NOT NULL,              -- MBBS | PG | BDS
  phone           text NOT NULL,              -- +91XXXXXXXXXX
  serial          integer NOT NULL,           -- the S.No, fixed at first sight
  team            jsonb,                      -- the team fields as last synced
  row_hash        text,                       -- the student fields as last written
  counselor_id    integer,                    -- the AH Counselor app's client id (PG)
  counselor_url   text,                       -- its Find-seats link
  counselor_hash  text,
  synced_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tab, phone)
);

-- The 10 AM digest goes once a day, whatever the cron does.
CREATE TABLE IF NOT EXISTS staff_digests (
  day      date PRIMARY KEY,
  sent_at  timestamptz NOT NULL DEFAULT now(),
  report   jsonb
);

-- Old status words, renamed to the ones the sheet uses.
UPDATE leads SET lead_status = 'Interested' WHERE lead_status = 'Qualified';
UPDATE leads SET lead_status = 'Not interested' WHERE lead_status = 'Lost';
