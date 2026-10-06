-- Replies to the menu at the end of a sign-in code message ("Reply 1 for a
-- counsellor call, 2 for the colleges your rank reached, 3 for the document
-- checklist"). One row per answered reply: what stops the same option being
-- answered twice in a day, and the count that says whether the messages are
-- earning replies — the signal WhatsApp judges a sender by.
CREATE TABLE IF NOT EXISTS wa_replies (
  id         serial PRIMARY KEY,
  phone      varchar(24) NOT NULL,
  choice     varchar(8)  NOT NULL,
  sender_id  integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wa_replies_phone_time ON wa_replies (phone, created_at);
