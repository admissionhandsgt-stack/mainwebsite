-- "Leave any time" → "stay up to date" (owner, 2026-10-22: "leave anytime ki jagah updates, information stay
-- up to date aisa dalte"). The rows were seeded minutes earlier; each changes only while it holds the seeded words.
BEGIN;
UPDATE site_settings SET value = $new$MCC's {round} result and allotment PDF on the Admission Hands Telegram channel as soon as MCC publishes it, and every counselling update and notice in between, so you stay up to date. Free to join.$new$, updated_at = now()
 WHERE key = 'telegram.round.body' AND value = $old$MCC's {round} result and allotment PDF on the Admission Hands Telegram channel as soon as MCC publishes it, with every counselling notice in between. Free to join, leave any time.$old$;
UPDATE site_settings SET value = $new$NEET PG {year} {round} result: get the alert on Telegram the moment MCC publishes it, and stay up to date with every counselling update. Free to join.$new$, updated_at = now()
 WHERE key = 'telegram.round.nudge' AND value = $old$NEET PG {year} {round} result: get the alert on Telegram the moment MCC publishes it. Free, leave any time.$old$;
COMMIT;
SELECT key, value FROM site_settings WHERE key IN ('telegram.round.body', 'telegram.round.nudge') ORDER BY key;
