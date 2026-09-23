-- Real accounts for the people using the site.
--
-- Until now there was only a gate: give a phone number, get a signed cookie,
-- see the data. That captures a lead but it is not an account — nothing is
-- remembered, nothing can be returned to, and a visitor who clears their
-- cookies is a stranger again.
--
-- **No passwords.** The audience is students in the middle of counselling,
-- often on a borrowed phone, and a password is one more thing to forget at the
-- worst possible moment. Identity here is the phone number, proved by the
-- visitor messaging us on WhatsApp — which already exists (`src/lib/waVerify.ts`)
-- and is free. Signing up and signing in are therefore the same action: if the
-- number is known it is a login, if it is new it is a registration.
--
-- `admin_users` is deliberately separate. Site visitors and staff have nothing
-- in common but the word "user", and one table would mean one bug away from a
-- student holding an admin session.

CREATE TABLE IF NOT EXISTS users (
    id              serial PRIMARY KEY,

    -- The identity. E.164, as `normalisePhone` produces it.
    phone           varchar(24) NOT NULL,

    name            text,
    email           text,

    -- What they last searched for, so the predictor can open where they left
    -- off instead of asking again.
    level           level,
    rank            integer,
    category        text,

    -- Set when the number was proved over WhatsApp, null when it was only
    -- typed. Both make an account; only one is evidence.
    verified_at     timestamptz,

    last_seen_at    timestamptz NOT NULL DEFAULT now(),
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_idx ON users (phone);

-- Server-side sessions, like the admin's: a row that can be deleted, not a
-- token that stays valid until it expires. Signing out has to actually work.
CREATE TABLE IF NOT EXISTS user_sessions (
    id          varchar(64) PRIMARY KEY,
    user_id     integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at  timestamptz NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS user_sessions_expiry_idx ON user_sessions (expires_at);

-- Which colleges a student is tracking. The first thing an account is
-- actually *for*: a shortlist that survives closing the tab.
CREATE TABLE IF NOT EXISTS saved_colleges (
    id            serial PRIMARY KEY,
    user_id       integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institute_slug varchar(200) NOT NULL,
    level         level NOT NULL,
    note          text,
    created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS saved_colleges_unique_idx
    ON saved_colleges (user_id, institute_slug);
