-- WhatsApp chats are kept for good (owner, 2026-10-16: "chats ka data save karke rakhna … delete mat hone
-- dena"). The record of what we sent a student and what they wrote back is how the team remembers a
-- conversation, and a deleted or rewritten line is a promise nobody can check any more.
--
-- Enforced in the database, not only by having no delete button: a script, a cascade or a hand-typed
-- query is stopped as well.
--   - no row of wa_messages can be deleted;
--   - what was said cannot change — direction, number, kind, template, body, who sent it, when, Meta's id;
--   - delivery receipts, errors, pricing and "seen" can still be written, which is all the webhook and
--     the inbox ever do.
-- The one door, for a lawful erasure request (DPDP Act) and nothing else, is a deliberate setting in the
-- same transaction:  SET LOCAL ah.allow_wa_erase = 'on';

CREATE OR REPLACE FUNCTION wa_messages_keep() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(current_setting('ah.allow_wa_erase', true), '') = 'on' THEN
    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'WhatsApp chat history is kept permanently; rows in wa_messages cannot be deleted';
  END IF;
  IF NEW.direction IS DISTINCT FROM OLD.direction
     OR NEW.phone IS DISTINCT FROM OLD.phone
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.template IS DISTINCT FROM OLD.template
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.sent_by IS DISTINCT FROM OLD.sent_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR (OLD.wamid IS NOT NULL AND NEW.wamid IS DISTINCT FROM OLD.wamid) THEN
    RAISE EXCEPTION 'What a WhatsApp message said cannot be changed; only its delivery status can';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS wa_messages_keep_update ON wa_messages;
CREATE TRIGGER wa_messages_keep_update BEFORE UPDATE ON wa_messages FOR EACH ROW EXECUTE FUNCTION wa_messages_keep();
DROP TRIGGER IF EXISTS wa_messages_keep_delete ON wa_messages;
CREATE TRIGGER wa_messages_keep_delete BEFORE DELETE ON wa_messages FOR EACH ROW EXECUTE FUNCTION wa_messages_keep();

-- TRUNCATE skips row triggers, so it gets its own guard.
CREATE OR REPLACE FUNCTION wa_messages_no_truncate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(current_setting('ah.allow_wa_erase', true), '') <> 'on' THEN
    RAISE EXCEPTION 'WhatsApp chat history is kept permanently; wa_messages cannot be truncated';
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS wa_messages_keep_truncate ON wa_messages;
CREATE TRIGGER wa_messages_keep_truncate BEFORE TRUNCATE ON wa_messages FOR EACH STATEMENT EXECUTE FUNCTION wa_messages_no_truncate();
