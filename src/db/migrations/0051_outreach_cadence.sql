-- Outreach cadence and replies (2026-11-10, owner: "same email id par email twice a week jaye max with approval from
-- telegram and jiska response aa jaye wo auto email targets ruk jaye"). Per address: how many emails went and when the
-- last one did, so follow-ups keep three days apart (at most two a week) and stop at three; and when a reply or a bounce
-- arrived (read from the mailbox over IMAP), which stops everything for that address.

ALTER TABLE outreach_emails ADD COLUMN IF NOT EXISTS emails_sent  integer NOT NULL DEFAULT 0;
ALTER TABLE outreach_emails ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;
ALTER TABLE outreach_emails ADD COLUMN IF NOT EXISTS replied_at   timestamptz;
ALTER TABLE outreach_emails ADD COLUMN IF NOT EXISTS reply_note   text;   -- the reply's subject, or why it bounced

-- Rows sent before this migration: one email each.
UPDATE outreach_emails SET emails_sent = 1, last_sent_at = sent_at WHERE sent_at IS NOT NULL AND emails_sent = 0;
UPDATE outreach_emails SET emails_sent = 2, last_sent_at = followed_up_at WHERE followed_up_at IS NOT NULL;
