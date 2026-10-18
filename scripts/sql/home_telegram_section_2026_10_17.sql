-- The homepage's Telegram invite (components/engage/TelegramJoin.tsx), placed
-- right after the enquiry form. Without a row a section renders last (after the
-- videos); with one, the admin can move or hide it under Page layout. It shares
-- display_order 4 with the enquiry form, and the code lists it after that form,
-- so it follows it. Never overwrites a row somebody already edited.
INSERT INTO page_sections (page, section_key, label, description, display_order, is_visible)
VALUES ('home', 'telegram', 'Telegram channel', 'The invite to join the Admission Hands Telegram channel for counselling updates', 4, true)
ON CONFLICT (page, section_key) DO NOTHING;

SELECT section_key, display_order, is_visible FROM page_sections WHERE page = 'home' ORDER BY display_order, id;
