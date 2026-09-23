-- The two PG curation tables the admin has always had tabs for.
--
-- They were empty in Supabase, so the migration had nothing to copy and did
-- not create them. The admin tabs were therefore pointing at tables that do
-- not exist: they rendered blank before and would error now that the admin
-- talks to Postgres directly.
--
-- Same shape as ug_recommended_colleges, so GenericCollegeManager works
-- against them unchanged.

CREATE TABLE IF NOT EXISTS pg_recommended_colleges (
    id               serial PRIMARY KEY,
    slug             varchar(200) NOT NULL,
    college_name     text NOT NULL,
    college_type     text,
    state            text,
    city             text,
    university_name  text,
    established_year smallint,
    intake           integer,
    nri_seats        integer,
    has_nri_seats    boolean NOT NULL DEFAULT false,
    is_women_only    boolean NOT NULL DEFAULT false,
    image_url        text,
    source_type      text,
    display_order    integer NOT NULL DEFAULT 0,
    is_active        boolean NOT NULL DEFAULT true,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pg_recommended_colleges_slug_idx
    ON pg_recommended_colleges (slug);
CREATE INDEX IF NOT EXISTS pg_recommended_colleges_order_idx
    ON pg_recommended_colleges (is_active, display_order, college_name);

CREATE TABLE IF NOT EXISTS pg_deemed_colleges (
    id               serial PRIMARY KEY,
    slug             varchar(200) NOT NULL,
    college_name     text NOT NULL,
    college_type     text,
    state            text,
    city             text,
    university_name  text,
    established_year smallint,
    intake           integer,
    nri_seats        integer,
    has_nri_seats    boolean NOT NULL DEFAULT false,
    is_women_only    boolean NOT NULL DEFAULT false,
    image_url        text,
    source_type      text,
    display_order    integer NOT NULL DEFAULT 0,
    is_active        boolean NOT NULL DEFAULT true,
    created_at       timestamptz NOT NULL DEFAULT now(),
    updated_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pg_deemed_colleges_slug_idx
    ON pg_deemed_colleges (slug);
CREATE INDEX IF NOT EXISTS pg_deemed_colleges_order_idx
    ON pg_deemed_colleges (is_active, display_order, college_name);
