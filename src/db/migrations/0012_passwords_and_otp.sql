-- A real login, with a password after the first time.
--
-- Migration 0010 argued for no passwords at all: the audience is students in
-- the middle of counselling, often on a borrowed phone, and a password is one
-- more thing to lose. That reasoning was about *forcing* a password. What it
-- produced instead was a sign-in that needs WhatsApp every single time, which
-- is worse: a visitor on a laptop had to pick up their phone, find our number,
-- and send a message — to read a page they had already loaded.
--
-- So both. The number is still proved once, by a code we send to it. After
-- that a password gets them back in from any device in two fields, and it is
-- optional — skip it and the code path still works.
--
--   first visit   phone -> code we send on WhatsApp -> verified -> set password
--   every visit   phone -> password
--   forgot it     phone -> code -> set a new one
--
-- The code is *sent* here, where migration 0008 deliberately only received
-- one. 0008's reasoning about WhatsApp ban signals is real and still holds, so
-- the sending is capped per number and per day (see `src/lib/otp.ts`) and the
-- receive-only path from 0008 remains as the fallback when a send cannot be
-- made. It is not deleted, because it is the thing that works when the
-- gateway is unpaired.

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_set_at timestamptz;

-- Codes we sent, one row per send.
--
-- Separate from `verification_attempts` on purpose. That table models the
-- inbound handshake, where the code is a token the visitor carries to us and
-- the interesting column is which number it arrived from. This one models a
-- credential we issued to a number we already know: what matters is how many
-- times it has been guessed and whether it has been spent.
CREATE TABLE IF NOT EXISTS otp_codes (
    id              serial PRIMARY KEY,

    -- The number the code was sent to, E.164.
    phone           varchar(24) NOT NULL,

    -- HMAC of the code, never the code. Six digits is a small space, so this
    -- is not brute-force protection — it is so that reading this table, or a
    -- backup of it, does not hand over live credentials. The key lives in the
    -- environment, so the digits cannot be recovered from the row alone.
    code_hash       text NOT NULL,

    -- 'signup' proves a new number; 'reset' re-proves one to replace a
    -- forgotten password. Kept apart so a code minted for one cannot be
    -- redeemed for the other.
    purpose         text NOT NULL,

    -- Carried through the handshake, because the visitor filled it in before
    -- the code existed and must not be asked twice.
    name            text,
    level           level,
    rank            integer,
    category        text,
    source_page     text,

    -- How it actually reached them, or null if it never did.
    sent_channel    text,

    -- Wrong guesses. A six-digit code with unlimited attempts is a four-digit
    -- code; this is what makes the length mean anything.
    attempts        integer NOT NULL DEFAULT 0,

    consumed_at     timestamptz,
    expires_at      timestamptz NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Verification looks up the newest live code for a number.
CREATE INDEX IF NOT EXISTS otp_codes_phone_idx ON otp_codes (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS otp_codes_expiry_idx ON otp_codes (expires_at);

-- The per-number send cap counts rows in a window, so it reads this directly.
CREATE INDEX IF NOT EXISTS otp_codes_recent_idx ON otp_codes (phone, created_at);
