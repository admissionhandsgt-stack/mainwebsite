-- Create UG All Colleges
create table ug_all_colleges (
  id bigint primary key generated always as identity,
  slug text not null unique,
  college_name text not null,
  college_type text not null default 'Government',
  state text not null,
  city text,
  university_name text,
  established_year integer,
  intake integer,
  nri_seats integer,
  minority_seats integer,
  has_nri_seats boolean not null default false,
  has_minority_seats boolean not null default false,
  is_women_only boolean not null default false,
  display_order integer not null default 0,
  is_active boolean not null default true,
  source_type text not null default 'manual',
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create UG Recommended Colleges
create table ug_recommended_colleges (
  id bigint primary key generated always as identity,
  slug text not null unique,
  college_name text not null,
  college_type text not null default 'Government',
  state text not null,
  city text,
  university_name text,
  established_year integer,
  intake integer,
  nri_seats integer,
  minority_seats integer,
  has_nri_seats boolean not null default false,
  has_minority_seats boolean not null default false,
  is_women_only boolean not null default false,
  display_order integer not null default 0,
  is_active boolean not null default true,
  source_type text not null default 'manual',
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create PG All Colleges
create table pg_all_colleges (
  id bigint primary key generated always as identity,
  slug text not null unique,
  college_name text not null,
  college_type text not null default 'Government',
  state text not null,
  city text,
  university_name text,
  established_year integer,
  intake integer,
  nri_seats integer,
  minority_seats integer,
  has_nri_seats boolean not null default false,
  has_minority_seats boolean not null default false,
  is_women_only boolean not null default false,
  display_order integer not null default 0,
  is_active boolean not null default true,
  source_type text not null default 'manual',
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create PG Recommended Colleges
create table pg_recommended_colleges (
  id bigint primary key generated always as identity,
  slug text not null unique,
  college_name text not null,
  college_type text not null default 'Government',
  state text not null,
  city text,
  university_name text,
  established_year integer,
  intake integer,
  nri_seats integer,
  minority_seats integer,
  has_nri_seats boolean not null default false,
  has_minority_seats boolean not null default false,
  is_women_only boolean not null default false,
  display_order integer not null default 0,
  is_active boolean not null default true,
  source_type text not null default 'manual',
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create PG Deemed Colleges
create table pg_deemed_colleges (
  id bigint primary key generated always as identity,
  slug text not null unique,
  college_name text not null,
  college_type text not null default 'Government',
  state text not null,
  city text,
  university_name text,
  established_year integer,
  intake integer,
  nri_seats integer,
  minority_seats integer,
  has_nri_seats boolean not null default false,
  has_minority_seats boolean not null default false,
  is_women_only boolean not null default false,
  display_order integer not null default 0,
  is_active boolean not null default true,
  source_type text not null default 'manual',
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Note: The `deemed_colleges` table already exists and will be used for UG Deemed Colleges.
