-- Create ug_colleges table for State-wise Medical Colleges
CREATE TABLE IF NOT EXISTS public.ug_colleges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    college_name TEXT NOT NULL,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    college_type TEXT NOT NULL,
    established_year INTEGER,
    short_description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.ug_colleges ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read access for active ug colleges" 
    ON public.ug_colleges FOR SELECT 
    USING (is_active = true);

CREATE POLICY "Admin full access" 
    ON public.ug_colleges FOR ALL 
    USING (auth.role() = 'authenticated');
