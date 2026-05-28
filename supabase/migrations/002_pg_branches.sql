-- Migration: 002_pg_branches
-- Description: Create pg_branches table for PG medical branch management

-- Create the pg_branches table
CREATE TABLE IF NOT EXISTS public.pg_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_name VARCHAR(255) NOT NULL UNIQUE,
  short_description TEXT,
  icon_url TEXT,
  category VARCHAR(50) DEFAULT 'clinical', -- clinical, surgical, non_clinical
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.pg_branches ENABLE ROW LEVEL SECURITY;

-- Public read policy: anyone can read all PG branches
CREATE POLICY "Public can view all PG branches"
  ON public.pg_branches
  FOR SELECT
  USING (true);

-- Authenticated users full CRUD policy
CREATE POLICY "Authenticated users have full access to PG branches"
  ON public.pg_branches
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
