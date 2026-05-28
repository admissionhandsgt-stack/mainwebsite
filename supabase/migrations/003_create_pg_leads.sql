-- ============================================================
-- 003_create_pg_leads.sql
-- Create pg_leads table for elite PG intake system
-- ============================================================

CREATE TABLE IF NOT EXISTS public.pg_leads (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  phone              TEXT NOT NULL,
  rank               INTEGER,
  preferred_branch   TEXT,
  preferred_state    TEXT,
  quota_interest     TEXT, -- Store comma-separated values or text
  internship_status  TEXT,
  source_page        TEXT DEFAULT 'PG Page',
  lead_status        TEXT DEFAULT 'New',
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.pg_leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone (anonymous public users) to insert leads (for the contact forms)
DROP POLICY IF EXISTS "Allow public insert pg_leads" ON public.pg_leads;
CREATE POLICY "Allow public insert pg_leads" ON public.pg_leads 
  FOR INSERT WITH CHECK (true);

-- Only authenticated admin users can read, update, or delete leads
DROP POLICY IF EXISTS "Admin read/write pg_leads" ON public.pg_leads;
CREATE POLICY "Admin read/write pg_leads" ON public.pg_leads 
  FOR ALL USING (auth.role() = 'authenticated');
