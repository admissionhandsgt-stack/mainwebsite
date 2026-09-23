-- Somewhere for production failures to land.
--
-- Until now every `catch` ended in `console.error`, which on Cloudflare
-- Workers means it scrolls past in a tail nobody is watching. A 500 in
-- production was invisible: the visitor saw a broken page and we found out
-- when somebody phoned in, if ever.
--
-- Postgres rather than a hosted service, for the same reasons the rest of this
-- stack is self-hosted: no per-event bill, no third party holding the data, and
-- the database is already there and already backed up by `pg-backup.sh`.
--
-- The trade is that this cannot tell us the site is *down* — if Postgres is
-- unreachable, so is the log. It answers "what is failing" for a site that is
-- up, which is the common case and the one we had no answer for at all.

CREATE TABLE IF NOT EXISTS error_log (
    id          bigserial PRIMARY KEY,

    level       varchar(16) NOT NULL DEFAULT 'error',

    -- Grouped on in the admin, so the same failure 400 times reads as one row
    -- with a count rather than 400 rows.
    fingerprint varchar(64) NOT NULL,

    message     text NOT NULL,
    stack       text,

    -- Where it happened, and to whom, well enough to reproduce.
    route       text,
    method      varchar(10),
    status      integer,

    -- Never the raw address: an IP is personal data and we only ever need to
    -- know whether two failures came from the same visitor.
    ip_hash     varchar(32),
    user_agent  text,

    -- Anything route-specific worth keeping. Free-form on purpose; a schema
    -- here would be guessed rather than known.
    meta        jsonb,

    created_at  timestamptz NOT NULL DEFAULT now()
);

-- The admin reads "recent, newest first" and "this fingerprint's history".
CREATE INDEX IF NOT EXISTS error_log_recent_idx ON error_log (created_at DESC);
CREATE INDEX IF NOT EXISTS error_log_fingerprint_idx ON error_log (fingerprint, created_at DESC);
