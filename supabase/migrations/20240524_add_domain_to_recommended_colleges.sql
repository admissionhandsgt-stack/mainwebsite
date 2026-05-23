-- Migration: Add domain column to recommended_colleges table
ALTER TABLE public.recommended_colleges ADD COLUMN IF NOT EXISTS domain TEXT DEFAULT 'ug';

-- Add check constraint to ensure only 'ug' or 'pg' values are stored
ALTER TABLE public.recommended_colleges DROP CONSTRAINT IF EXISTS check_recommended_colleges_domain;
ALTER TABLE public.recommended_colleges ADD CONSTRAINT check_recommended_colleges_domain CHECK (domain IN ('ug', 'pg'));

-- Make sure RLS Policies are correctly applied
ALTER TABLE public.recommended_colleges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read recommended_colleges" ON public.recommended_colleges;
CREATE POLICY "Public read recommended_colleges" ON public.recommended_colleges 
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth write recommended_colleges" ON public.recommended_colleges;
CREATE POLICY "Auth write recommended_colleges" ON public.recommended_colleges 
    FOR ALL USING (auth.role() = 'authenticated');
