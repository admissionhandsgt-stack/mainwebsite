-- WhatsApp follow-ups to students who signed in and stopped (2026-10-13).
--
-- One row per (user, template): a student gets each follow-up at most once,
-- ever. That is the whole anti-spam rule, and it lives in the table rather than
-- in memory so a deploy or a second process cannot send it twice.
CREATE TABLE IF NOT EXISTS wa_followups (
  id         bigserial PRIMARY KEY,
  user_id    integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template   text    NOT NULL,
  status     text    NOT NULL,            -- sent | failed | skipped
  message_id text,
  error      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, template)
);
