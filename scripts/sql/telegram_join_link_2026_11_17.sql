-- The site's Telegram links become the channel's request-to-join link (owner, 2026-11-17, via the PG session): the students'
-- bot welcomes and approves each request within a minute; joins through the public address never reached it (82 → 87
-- members, 0 bot users). Guarded on the old value, so an admin's later edit is never overwritten.
UPDATE site_settings SET value = 'https://t.me/+2oCwgUBSa6xjOGJl', updated_at = now()
 WHERE key = 'social.telegram' AND value = 'https://t.me/AdmissionHandsIndia';
