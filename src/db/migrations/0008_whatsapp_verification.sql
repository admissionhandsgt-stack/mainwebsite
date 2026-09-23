-- Reverse WhatsApp verification: the visitor messages us, not the other way round.
--
-- Sending an OTP is the worst thing you can do to a WhatsApp number. The ban
-- models weight reply-ratio (nobody replies to an OTP), contact-graph distance
-- (every recipient is a stranger) and robotic timing (a form submit fires it) —
-- outbound OTP fails all three, which is why unofficial gateways doing it get
-- numbers banned in weeks.
--
-- Turning it around fixes all three at once. We generate a code, the visitor
-- taps a wa.me link that opens their own WhatsApp with the message already
-- written, and they send it to us. We only ever receive. And it is *stronger*
-- verification than sending a code: the message arrives from their real
-- WhatsApp account, so we learn the number is theirs and that they are on
-- WhatsApp at all — which matters, because this business runs on WhatsApp.
--
-- The state has to live here rather than in memory: the three steps (browser
-- asks for a code, the gateway delivers the inbound message, the browser polls)
-- are separate requests, and on Workers they may not share an isolate.

CREATE TABLE IF NOT EXISTS verification_attempts (
    id              serial PRIMARY KEY,

    -- The browser's handle on its own attempt. Random rather than the serial
    -- id, so nobody can poll somebody else's verification by counting up.
    token           varchar(64) NOT NULL,

    -- What the visitor actually sends on WhatsApp. Short enough to read out,
    -- long enough not to be guessed inside the expiry window.
    code            varchar(16) NOT NULL,

    -- Collected before verifying so the lead survives even if they never send
    -- the message. `phone_claimed` is what they typed, if anything; the number
    -- we trust is `verified_phone`, because that one messaged us.
    name            text,
    phone_claimed   varchar(24),
    level           level,
    rank            integer,
    category        text,
    source_page     text,

    verified_phone  varchar(24),
    verified_at     timestamptz,

    expires_at      timestamptz NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS verification_attempts_token_idx
    ON verification_attempts (token);

-- The inbound webhook looks a code up among attempts still waiting. Two live
-- attempts must never share a code or an arriving message would be ambiguous;
-- once an attempt is verified or expired its code is free to be reissued, so
-- the constraint is partial rather than global.
CREATE UNIQUE INDEX IF NOT EXISTS verification_attempts_pending_code_idx
    ON verification_attempts (code)
    WHERE verified_at IS NULL;

CREATE INDEX IF NOT EXISTS verification_attempts_expiry_idx
    ON verification_attempts (expires_at);
