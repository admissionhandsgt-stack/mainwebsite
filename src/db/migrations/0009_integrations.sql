-- Settings for outside services, kept away from the ones the site renders.
--
-- `site_settings` looks like the obvious home for these, but the root layout
-- loads every setting and hands them to `SiteShell` as plain props — so
-- everything in that table reaches the browser. An API key there would be
-- published on every page load.
--
-- This table is read by the server only. It is not in the allow-list of
-- `/api/content/[resource]`, no page reads it, and the admin API masks any row
-- marked secret before it answers. That is what lets a non-technical admin
-- paste a gateway key in without it ending up in the HTML.

CREATE TABLE IF NOT EXISTS integrations (
    id          serial PRIMARY KEY,

    -- Dotted, like site_settings: 'whatsapp.gateway.url'.
    key         varchar(96) NOT NULL,

    value       text,

    -- Masked on the way out, and only overwritten when the admin actually
    -- types a new value — otherwise saving the form with a masked field
    -- showing would wipe the real one.
    is_secret   boolean NOT NULL DEFAULT false,

    updated_at  timestamptz NOT NULL DEFAULT now(),
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS integrations_key_idx ON integrations (key);

-- Seeded empty so the admin screen has rows to edit and the shape is visible
-- in the database without running the app.
INSERT INTO integrations (key, value, is_secret) VALUES
    ('whatsapp.verify.enabled',  'false', false),
    -- The number visitors message. Public by nature — it is printed in the
    -- wa.me link — so it is not a secret.
    ('whatsapp.verify.number',   '',      false),
    -- Where WAHA is reachable from the app. Empty means the admin can still
    -- set the number, but cannot pair or read status from here.
    ('whatsapp.gateway.url',     '',      false),
    ('whatsapp.gateway.api_key', '',      true),
    -- Shared with the container as WHATSAPP_HOOK_HMAC_KEY. The inbound
    -- webhook refuses everything when this is unset, so it fails closed.
    ('whatsapp.webhook.secret',  '',      true)
ON CONFLICT (key) DO NOTHING;
