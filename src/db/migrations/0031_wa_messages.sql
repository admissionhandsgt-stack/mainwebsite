-- Every message the official WhatsApp number sends or receives (2026-10-16).
--
-- Written for the reason it exists: from 13 to 16 October Meta accepted 53
-- sign-in codes and delivered none of them, and nothing here could tell,
-- because "accepted" is all the send call ever says. Delivery, reads and
-- failures arrive later on the webhook (/api/whatsapp/cloud) and land on the
-- same row, keyed by Meta's message id.
--
-- A sign-in code's digits are never stored here — a staff member reading this
-- log must not be able to sign in as the student.
CREATE TABLE IF NOT EXISTS wa_messages (
  id               bigserial PRIMARY KEY,
  direction        text NOT NULL,          -- out | in
  wamid            text UNIQUE,            -- Meta's message id; null only for rows backfilled from before tracking
  phone            text NOT NULL,          -- the other party, +91XXXXXXXXXX
  name             text,                   -- the WhatsApp profile name, inbound only
  kind             text NOT NULL,          -- otp | followup | callback | reply | other
  template         text,
  body             text,
  status           text NOT NULL,          -- accepted | sent | delivered | read | failed | received | unknown
  error_code       integer,
  error_title      text,
  error_detail     text,
  billable         boolean,
  pricing_category text,
  otp_id           bigint REFERENCES otp_codes(id) ON DELETE SET NULL,
  sent_at          timestamptz,
  delivered_at     timestamptz,
  read_at          timestamptz,
  failed_at        timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wa_messages_created_idx ON wa_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS wa_messages_phone_idx ON wa_messages (phone);

-- The codes sent before this table existed, so the log starts on 13 October
-- rather than today. Their delivery was never reported, so it stays unknown.
INSERT INTO wa_messages (direction, phone, kind, template, body, status, otp_id, created_at, updated_at)
SELECT 'out', o.phone, 'otp', 'ah_login_code', 'Sign-in code', 'unknown', o.id, o.created_at, o.created_at
  FROM otp_codes o
 WHERE o.sent_channel = 'cloud'
   AND NOT EXISTS (SELECT 1 FROM wa_messages m WHERE m.otp_id = o.id);
