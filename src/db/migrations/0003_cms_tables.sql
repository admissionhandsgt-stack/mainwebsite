-- CMS tables, migrated off Supabase.
--
-- Written by hand rather than generated: drizzle-kit wanted an interactive
-- answer about whether renamed columns on leads/live_alerts/media_assets were
-- renames or drops. Those three were empty, so they are simply recreated here.
--
-- Everything is IF NOT EXISTS so re-running is safe.

/* ---------------- curated college lists ---------------- */

CREATE TABLE IF NOT EXISTS ug_all_colleges (
    id                 serial PRIMARY KEY,
    slug               varchar(200) NOT NULL,
    college_name       text NOT NULL,
    college_type       text,
    state              text,
    city               text,
    university_name    text,
    established_year   smallint,
    intake             integer,
    nri_seats          integer,
    minority_seats     integer,
    has_nri_seats      boolean NOT NULL DEFAULT false,
    has_minority_seats boolean NOT NULL DEFAULT false,
    is_women_only      boolean NOT NULL DEFAULT false,
    image_url          text,
    source_type        text,
    display_order      integer NOT NULL DEFAULT 0,
    is_active          boolean NOT NULL DEFAULT true,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ug_all_slug_idx  ON ug_all_colleges (slug);
CREATE INDEX IF NOT EXISTS ug_all_order_idx        ON ug_all_colleges (display_order, college_name);
CREATE INDEX IF NOT EXISTS ug_all_state_idx        ON ug_all_colleges (state);

CREATE TABLE IF NOT EXISTS ug_recommended_colleges (LIKE ug_all_colleges INCLUDING DEFAULTS);
ALTER TABLE ug_recommended_colleges ADD COLUMN IF NOT EXISTS id serial;
CREATE UNIQUE INDEX IF NOT EXISTS ug_rec_slug_idx  ON ug_recommended_colleges (slug);
CREATE INDEX IF NOT EXISTS ug_rec_order_idx        ON ug_recommended_colleges (display_order, college_name);

CREATE TABLE IF NOT EXISTS deemed_colleges (LIKE ug_all_colleges INCLUDING DEFAULTS);
ALTER TABLE deemed_colleges ADD COLUMN IF NOT EXISTS id serial;
CREATE UNIQUE INDEX IF NOT EXISTS deemed_slug_idx  ON deemed_colleges (slug);
CREATE INDEX IF NOT EXISTS deemed_order_idx        ON deemed_colleges (display_order, college_name);

CREATE TABLE IF NOT EXISTS pg_colleges_content (
    id                serial PRIMARY KEY,
    college_name      text NOT NULL,
    city              text,
    state             text,
    college_type      text,
    ownership         text,
    year_established  smallint,
    total_pg_seats    integer,
    key_specialties   text,
    short_description text,
    image_url         text,
    display_order     integer NOT NULL DEFAULT 0,
    is_active         boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pg_content_order_idx ON pg_colleges_content (display_order, college_name);

CREATE TABLE IF NOT EXISTS recommended_colleges (
    id            serial PRIMARY KEY,
    name          text NOT NULL,
    location      text,
    fees          text,
    seats         integer,
    image         text,
    domain        level NOT NULL DEFAULT 'ug',
    display_order integer NOT NULL DEFAULT 0,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);

/* ---------------- content ---------------- */

CREATE TABLE IF NOT EXISTS pg_branches (
    id                serial PRIMARY KEY,
    branch_name       text NOT NULL,
    short_description text,
    icon_url          text,
    category          text,
    display_order     integer NOT NULL DEFAULT 0,
    is_active         boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pg_branches_order_idx ON pg_branches (display_order, branch_name);

CREATE TABLE IF NOT EXISTS mbbs_states (
    id             serial PRIMARY KEY,
    name           text NOT NULL,
    slug           varchar(120) NOT NULL,
    image_url      text,
    colleges_count integer,
    content        text,
    is_active      boolean NOT NULL DEFAULT true,
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS mbbs_states_slug_idx ON mbbs_states (slug);

CREATE TABLE IF NOT EXISTS videos (
    id          serial PRIMARY KEY,
    title       text NOT NULL,
    videos_id   text NOT NULL,
    description text,
    featured    boolean NOT NULL DEFAULT false,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS legal_documents (
    id           serial PRIMARY KEY,
    slug         varchar(120) NOT NULL,
    title        text NOT NULL,
    content      text NOT NULL,
    last_updated timestamptz,
    is_published boolean NOT NULL DEFAULT true,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS legal_slug_idx ON legal_documents (slug);

CREATE TABLE IF NOT EXISTS contact_info (
    id                      serial PRIMARY KEY,
    phone_number            text,
    whatsapp_number         text,
    email                   text,
    lead_notification_phone text,
    created_at              timestamptz NOT NULL DEFAULT now(),
    updated_at              timestamptz NOT NULL DEFAULT now()
);

/* ---------------- leads: one table for both levels ---------------- */

CREATE TABLE IF NOT EXISTS leads (
    id                serial PRIMARY KEY,
    level             level,
    name              text,
    phone             varchar(24) NOT NULL,
    email             text,
    rank              integer,
    preferred_branch  text,
    preferred_state   text,
    quota_interest    text,
    internship_status text,
    category          text,
    message           text,
    source_page       text,
    lead_status       text NOT NULL DEFAULT 'new',
    is_read           boolean NOT NULL DEFAULT false,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at);
CREATE INDEX IF NOT EXISTS leads_phone_idx   ON leads (phone);
CREATE INDEX IF NOT EXISTS leads_status_idx  ON leads (lead_status, created_at);

/* ---------------- site chrome ---------------- */

CREATE TABLE IF NOT EXISTS live_alerts (
    id          serial PRIMARY KEY,
    title       text NOT NULL,
    link        text,
    image_url   text,
    is_active   boolean NOT NULL DEFAULT true,
    order_index integer NOT NULL DEFAULT 0,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alerts_order_idx ON live_alerts (is_active, order_index);

CREATE TABLE IF NOT EXISTS media_assets (
    id               serial PRIMARY KEY,
    media_key        varchar(120) NOT NULL,
    title            text,
    image_url        text NOT NULL,
    mobile_image_url text,
    alt_text         text,
    section_type     text,
    display_order    integer NOT NULL DEFAULT 0,
    is_active        boolean NOT NULL DEFAULT true,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS media_key_idx ON media_assets (media_key);

/* ---------------- admin auth, replacing Supabase Auth ---------------- */

CREATE TABLE IF NOT EXISTS admin_users (
    id            serial PRIMARY KEY,
    email         varchar(180) NOT NULL,
    password_hash text NOT NULL,
    name          text,
    is_active     boolean NOT NULL DEFAULT true,
    last_login_at timestamptz,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS admin_email_idx ON admin_users (email);

CREATE TABLE IF NOT EXISTS admin_sessions (
    id         varchar(64) PRIMARY KEY,
    user_id    integer NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_sessions_user_idx ON admin_sessions (user_id);
