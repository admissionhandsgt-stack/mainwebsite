-- A configurable content layer, so the site stops needing a deploy to change
-- its own words.
--
-- Two primitives cover almost everything that is currently hardcoded:
--
--   site_settings   one value under a key — a headline, a stat, a toggle
--   content_blocks  repeatable items in a named collection — services,
--                   testimonials, FAQs, process steps, why-us points
--
-- The alternative was a table and an admin screen per content type. That is a
-- dozen near-identical CRUD screens to build and maintain, and every new
-- section needs another one. Here, a new section is rows, not code.
--
-- Tables with real structure of their own (colleges, states, media, legal)
-- keep their own tables — this is for prose and small repeatable lists.

/* ---------------- single values ---------------- */

CREATE TABLE IF NOT EXISTS site_settings (
    id          serial PRIMARY KEY,
    -- Dotted key: page.section.field — 'home.hero.headline'
    key         varchar(160) NOT NULL,
    value       text,
    -- Drives which input the admin renders, and how the site reads it.
    value_type  text NOT NULL DEFAULT 'text',   -- text | longtext | number | boolean | image | url
    -- Grouping and help for the admin screen.
    group_name  text NOT NULL DEFAULT 'general',
    label       text NOT NULL,
    help        text,
    display_order integer NOT NULL DEFAULT 0,
    updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS site_settings_key_idx ON site_settings (key);
CREATE INDEX IF NOT EXISTS site_settings_group_idx ON site_settings (group_name, display_order);

/* ---------------- repeatable lists ---------------- */

CREATE TABLE IF NOT EXISTS content_blocks (
    id            serial PRIMARY KEY,
    -- Which list this belongs to: services, testimonials, faq_pg, steps_ug …
    collection    varchar(80) NOT NULL,
    title         text,
    subtitle      text,
    body          text,
    -- Lucide icon name, resolved through an allow-list in the UI.
    icon          text,
    image_url     text,
    link_url      text,
    link_label    text,
    -- Anything a specific collection needs and the columns above do not cover.
    data          jsonb NOT NULL DEFAULT '{}'::jsonb,
    display_order integer NOT NULL DEFAULT 0,
    is_active     boolean NOT NULL DEFAULT true,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_blocks_collection_idx
    ON content_blocks (collection, is_active, display_order);

/* ---------------- what collections exist ---------------- */

-- Registered here rather than hardcoded in the admin, so adding a section to
-- the site does not mean editing the admin UI.
CREATE TABLE IF NOT EXISTS content_collections (
    id            serial PRIMARY KEY,
    slug          varchar(80) NOT NULL,
    label         text NOT NULL,
    description   text,
    -- Which of the content_blocks columns this collection actually uses, so
    -- the editor shows a relevant form instead of every field every time.
    fields        jsonb NOT NULL DEFAULT '["title","body"]'::jsonb,
    display_order integer NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS content_collections_slug_idx ON content_collections (slug);
