-- Outreach emails (2026-11-10, owner: "email bhi auto bhejne ka banao… telegram ke through approval and preview and send
-- and changes"). One row per person or organisation written to: the draft, its Telegram preview, what was sent and when,
-- and one follow-up. Raw SQL, not in schema.ts (read and written by lib/outreach.ts with sql templates).

CREATE TABLE IF NOT EXISTS outreach_emails (
  id                serial PRIMARY KEY,
  email             text NOT NULL,
  name              text,                          -- the person, when known ("Dear <name>")
  org               text NOT NULL,                 -- the organisation
  kind              text NOT NULL,                 -- journalist | association | other
  why               text,                          -- why them: what they cover, where the address was found
  source_url        text,                          -- the public page the address was taken from
  subject           text NOT NULL,
  body              text NOT NULL,
  status            text NOT NULL DEFAULT 'draft', -- draft | previewed | sent | followup_previewed | followed_up | skipped | opted_out | failed
  tg_message_id     bigint,                        -- the Telegram preview being answered
  sent_at           timestamptz,
  followup_subject  text,
  followup_body     text,
  followed_up_at    timestamptz,
  last_error        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Nobody is written to twice: one row per address, ever.
CREATE UNIQUE INDEX IF NOT EXISTS outreach_emails_email ON outreach_emails (lower(email));
CREATE INDEX IF NOT EXISTS outreach_emails_status ON outreach_emails (status);
