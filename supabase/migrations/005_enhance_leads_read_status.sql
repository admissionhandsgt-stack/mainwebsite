-- ============================================================
-- 005_enhance_leads_read_status.sql
-- Add is_read boolean column to pg_leads and leads tables
-- ============================================================

ALTER TABLE public.pg_leads 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
