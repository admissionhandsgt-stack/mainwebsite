-- When a backup number was first seen connected, for its warm-up cap
-- (waSenders.effectiveCap): a newly linked device messaging strangers is what
-- got the primary locked on 2026-10-06. Reset when a different phone is paired.
ALTER TABLE wa_senders ADD COLUMN IF NOT EXISTS paired_at timestamptz;
