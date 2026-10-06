-- More than one WhatsApp number, so one locked or logged-out number does not
-- stop sign-in codes.
--
-- On 2026-10-06 WhatsApp put a six-hour "reach-out lock" on the only number:
-- no new chats from linked devices, and a sign-in code always goes to somebody
-- new. With a second number paired, codes roll over to it; with every number
-- out, the visitor gets the inbound path (they message us), which a lock does
-- not touch.
--
-- The primary number stays where it always was — the `integrations` rows the
-- admin screen edits — so nothing about it changes. This table holds the
-- backups. Each row is one WAHA gateway (one container: WAHA Core runs one
-- session, i.e. one number, per container).
--
-- Server-only, like `integrations`: `api_key` is a secret. Never add this table
-- to the allow-list in /api/content/[resource].

CREATE TABLE IF NOT EXISTS wa_senders (
  id          serial PRIMARY KEY,
  label       varchar(60)  NOT NULL,
  -- Digits with the country code, e.g. 919876543210. Filled from the session
  -- once the phone is paired; shown in the admin and used for wa.me links.
  phone       varchar(20),
  gateway_url text         NOT NULL,
  api_key     text,
  session     varchar(40)  NOT NULL DEFAULT 'default',
  enabled     boolean      NOT NULL DEFAULT true,
  -- Lower is tried first among numbers with the same number of codes sent today.
  priority    integer      NOT NULL DEFAULT 100,
  -- Sign-in codes (messages to strangers) this number may send per day. Lead
  -- alerts to staff do not count: those are existing chats.
  daily_cap   integer      NOT NULL DEFAULT 40 CHECK (daily_cap BETWEEN 0 AND 500),
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

-- Which number sent each code: 0 is the primary, otherwise wa_senders.id.
-- What the per-number daily caps count.
ALTER TABLE otp_codes ADD COLUMN IF NOT EXISTS sent_via integer;
CREATE INDEX IF NOT EXISTS otp_codes_sent_via_day ON otp_codes (sent_via, created_at) WHERE sent_channel IS NOT NULL;
