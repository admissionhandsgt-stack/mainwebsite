-- State PG fee & stipend PDFs sent on WhatsApp (2026-11-11). Raw SQL, not in schema.ts.
--
-- lead_pdfs: one row per state per build; the newest active row of a state is the one sent. The bytes live here (one
-- store, one backup, as the document vault), and `token` is the unguessable path Meta fetches the file from
-- (/api/wa-pdf/<token>) — a student only ever receives it in their own WhatsApp chat.
-- wa_optins: a student's "YES" to updates when a state's fees change, and a later STOP. Nothing is sent to anyone
-- without a row here, and a withdrawn row stops it.
CREATE TABLE IF NOT EXISTS lead_pdfs (
  id          serial PRIMARY KEY,
  slug        text        NOT NULL,          -- the PG state's slug (lib/pgStateQueries)
  state       text        NOT NULL,
  ref         text        NOT NULL,          -- the short code in the prefilled message, e.g. MH
  filename    text        NOT NULL,
  token       text        NOT NULL UNIQUE,
  content     bytea       NOT NULL,
  pages       integer,
  data_date   date,                          -- the newest data date the PDF prints
  active      boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lead_pdfs_slug_idx ON lead_pdfs (slug, created_at DESC) WHERE active;

CREATE TABLE IF NOT EXISTS wa_optins (
  id           serial PRIMARY KEY,
  phone        text        NOT NULL,
  topic        text        NOT NULL,         -- e.g. 'pg-fees:maharashtra'
  text         text        NOT NULL,         -- what the student sent
  source       text        NOT NULL,         -- 'whatsapp'
  created_at   timestamptz NOT NULL DEFAULT now(),
  withdrawn_at timestamptz
);
CREATE INDEX IF NOT EXISTS wa_optins_phone_idx ON wa_optins (phone);

-- One row per inbound message the PDF flow acted on, so a webhook Meta retries is never answered twice.
CREATE TABLE IF NOT EXISTS wa_pdf_events (
  wamid      text        PRIMARY KEY,
  phone      text        NOT NULL,
  action     text        NOT NULL,             -- pdf | menu-1 | menu-2 | yes | stop | none | cap
  slug       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
