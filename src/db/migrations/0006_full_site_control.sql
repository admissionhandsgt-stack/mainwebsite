-- Everything else the admin should own: navigation, per-page SEO, which
-- sections render, and enough columns on `leads` to actually work an enquiry.
--
-- Until now the CMS covered prose. These are the parts of the site that are
-- structure rather than copy, and each one was hardcoded in a component — so
-- changing a menu label or a page title meant a deploy.

/* ---------------- navigation ---------------- */

-- One table for every menu. `menu` says which one, `parent_id` gives the
-- header its dropdowns. A link is a row, so adding one is not a code change.
CREATE TABLE IF NOT EXISTS nav_items (
    id            serial PRIMARY KEY,
    -- header | footer_explore | footer_quick | mobile_bar
    menu          varchar(40) NOT NULL,
    label         text NOT NULL,
    url           text NOT NULL,
    parent_id     integer REFERENCES nav_items(id) ON DELETE CASCADE,
    display_order integer NOT NULL DEFAULT 0,
    is_active     boolean NOT NULL DEFAULT true,
    opens_new_tab boolean NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS nav_items_menu_idx
    ON nav_items (menu, is_active, display_order);
CREATE INDEX IF NOT EXISTS nav_items_parent_idx ON nav_items (parent_id);

/* ---------------- per-page SEO ---------------- */

-- Keyed by route so a page can look up its own metadata. Rows are seeded for
-- the routes that exist; a missing row falls back to what the page ships with.
CREATE TABLE IF NOT EXISTS page_seo (
    id            serial PRIMARY KEY,
    route         varchar(200) NOT NULL,
    page_label    text NOT NULL,
    title         text,
    description   text,
    keywords      text,
    og_image_url  text,
    -- Lets the team pull a page out of search without deleting it.
    no_index      boolean NOT NULL DEFAULT false,
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS page_seo_route_idx ON page_seo (route);

/* ---------------- section visibility and order ---------------- */

-- Which blocks of a page render, and in what order. The component for a
-- section still lives in code; this decides whether it is shown.
CREATE TABLE IF NOT EXISTS page_sections (
    id            serial PRIMARY KEY,
    page          varchar(80) NOT NULL,
    section_key   varchar(80) NOT NULL,
    label         text NOT NULL,
    description   text,
    display_order integer NOT NULL DEFAULT 0,
    is_visible    boolean NOT NULL DEFAULT true,
    updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS page_sections_key_idx
    ON page_sections (page, section_key);
CREATE INDEX IF NOT EXISTS page_sections_page_idx
    ON page_sections (page, display_order);

/* ---------------- leads: enough to work an enquiry ---------------- */

-- What the student sent stays immutable; these are the team's own columns.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_on date;
-- Kept alongside created_at so "new but old" enquiries are visible.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contacted_at timestamptz;

CREATE INDEX IF NOT EXISTS leads_status_idx ON leads (lead_status, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_unread_idx ON leads (is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS leads_followup_idx ON leads (follow_up_on)
    WHERE follow_up_on IS NOT NULL;
