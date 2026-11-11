-- Fee-update messages to students who replied YES after a state's PG fee PDF (2026-11-11). Raw SQL, not in schema.ts.
-- One row per (PDF build, phone): a student hears of each new build of a state's PDF at most once, and only when that
-- build prints newer figures than the one they took (lib/waPdfUpdates.ts). The row is written before the send, so two
-- runs never send twice.
CREATE TABLE IF NOT EXISTS wa_pdf_updates (
  pdf_id     integer     NOT NULL REFERENCES lead_pdfs (id),
  phone      text        NOT NULL,
  wamid      text,
  error      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pdf_id, phone)
);
