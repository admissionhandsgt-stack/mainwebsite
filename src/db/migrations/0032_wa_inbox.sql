-- The admin's WhatsApp inbox (2026-10-16): staff reply to students from the
-- official number, inside WhatsApp's 24-hour customer-service window.
--
-- `sent_by` records which admin wrote a reply, so a message a student received
-- can always be traced to a person. `seen_at` on an inbound message is when a
-- member of staff opened that conversation — what "unread" in the inbox means.
ALTER TABLE wa_messages ADD COLUMN IF NOT EXISTS sent_by text;
ALTER TABLE wa_messages ADD COLUMN IF NOT EXISTS seen_at timestamptz;

CREATE INDEX IF NOT EXISTS wa_messages_phone_time_idx ON wa_messages (phone, created_at DESC);
