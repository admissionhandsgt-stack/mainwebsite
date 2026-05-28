-- ============================================================
-- AdmissionHands Complete Database Setup
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- ---- 1. videos ----
CREATE TABLE IF NOT EXISTS public.videos (
  id          BIGSERIAL PRIMARY KEY,
  title       TEXT,
  videos_id   TEXT,
  description TEXT,
  featured    BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read videos" ON public.videos;
CREATE POLICY "Public read videos" ON public.videos FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth insert videos" ON public.videos;
CREATE POLICY "Auth insert videos" ON public.videos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth update videos" ON public.videos;
CREATE POLICY "Auth update videos" ON public.videos FOR UPDATE USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Auth delete videos" ON public.videos;
CREATE POLICY "Auth delete videos" ON public.videos FOR DELETE USING (auth.role() = 'authenticated');

-- ---- 2. recommended_colleges ----
CREATE TABLE IF NOT EXISTS public.recommended_colleges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  location    TEXT NOT NULL,
  fees        TEXT NOT NULL,
  seats       INTEGER DEFAULT 0,
  image       TEXT NOT NULL DEFAULT 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?q=80&w=800',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.recommended_colleges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read recommended_colleges" ON public.recommended_colleges;
CREATE POLICY "Public read recommended_colleges" ON public.recommended_colleges FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth write recommended_colleges" ON public.recommended_colleges;
CREATE POLICY "Auth write recommended_colleges" ON public.recommended_colleges FOR ALL USING (auth.role() = 'authenticated');

-- ---- 3. mbbs_states ----
CREATE TABLE IF NOT EXISTS public.mbbs_states (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  image_url      TEXT,
  colleges_count INTEGER DEFAULT 0,
  content        TEXT,
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.mbbs_states ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read mbbs_states" ON public.mbbs_states;
CREATE POLICY "Public read mbbs_states" ON public.mbbs_states FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth write mbbs_states" ON public.mbbs_states;
CREATE POLICY "Auth write mbbs_states" ON public.mbbs_states FOR ALL USING (auth.role() = 'authenticated');

-- ---- 4. contact_info ----
CREATE TABLE IF NOT EXISTS public.contact_info (
  id               BIGSERIAL PRIMARY KEY,
  phone_number     TEXT NOT NULL DEFAULT '+919873133846',
  whatsapp_number  TEXT NOT NULL DEFAULT '+919873133846',
  email            TEXT NOT NULL DEFAULT 'info@admissionhands.com',
  lead_notification_phone TEXT NOT NULL DEFAULT '+919310301949',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.contact_info ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read contact_info" ON public.contact_info;
CREATE POLICY "Public read contact_info" ON public.contact_info FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth write contact_info" ON public.contact_info;
CREATE POLICY "Auth write contact_info" ON public.contact_info FOR ALL USING (auth.role() = 'authenticated');

-- Insert default contact info if none exists
INSERT INTO public.contact_info (phone_number, whatsapp_number, email, lead_notification_phone)
SELECT '+919873133846', '+919873133846', 'info@admissionhands.com', '+919310301949'
WHERE NOT EXISTS (SELECT 1 FROM public.contact_info);

-- ---- 5. pg_colleges ----
CREATE TABLE IF NOT EXISTS public.pg_colleges (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name       TEXT NOT NULL,
  city               TEXT NOT NULL,
  state              TEXT NOT NULL,
  college_type       TEXT NOT NULL DEFAULT 'Government',
  ownership          TEXT,
  year_established   INTEGER,
  total_pg_seats     INTEGER DEFAULT 0,
  key_specialties    TEXT[] DEFAULT '{}',
  short_description  TEXT,
  image_url          TEXT,
  is_active          BOOLEAN DEFAULT true,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.pg_colleges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read pg_colleges" ON public.pg_colleges;
CREATE POLICY "Public read pg_colleges" ON public.pg_colleges FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth write pg_colleges" ON public.pg_colleges;
CREATE POLICY "Auth write pg_colleges" ON public.pg_colleges FOR ALL USING (auth.role() = 'authenticated');

-- ---- 6. deemed_universities ----
CREATE TABLE IF NOT EXISTS public.deemed_universities (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name          TEXT NOT NULL,
  city                  TEXT,
  state                 TEXT,
  deemed_university_name TEXT,
  established_year      INTEGER,
  offers_mbbs           BOOLEAN DEFAULT true,
  description           TEXT,
  image_url             TEXT,
  fees_range            TEXT,
  ranking               TEXT,
  seats                 INTEGER,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.deemed_universities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read deemed_universities" ON public.deemed_universities;
CREATE POLICY "Public read deemed_universities" ON public.deemed_universities FOR SELECT USING (true);
DROP POLICY IF EXISTS "Auth write deemed_universities" ON public.deemed_universities;
CREATE POLICY "Auth write deemed_universities" ON public.deemed_universities FOR ALL USING (auth.role() = 'authenticated');

-- ---- 7. Supabase Storage bucket for college images ----
INSERT INTO storage.buckets (id, name, public)
VALUES ('colleges', 'colleges', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read college images" ON storage.objects;
CREATE POLICY "Public read college images" ON storage.objects
  FOR SELECT USING (bucket_id = 'colleges');

DROP POLICY IF EXISTS "Auth upload college images" ON storage.objects;
CREATE POLICY "Auth upload college images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'colleges' AND auth.role() = 'authenticated');

-- ---- 8. pg_leads ----
CREATE TABLE IF NOT EXISTS public.pg_leads (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  phone              TEXT NOT NULL,
  rank               INTEGER,
  preferred_branch   TEXT,
  preferred_state    TEXT,
  quota_interest     TEXT,
  internship_status  TEXT,
  source_page        TEXT DEFAULT 'PG Page',
  lead_status        TEXT DEFAULT 'New',
  is_read            BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.pg_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public insert pg_leads" ON public.pg_leads;
CREATE POLICY "Allow public insert pg_leads" ON public.pg_leads FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin read/write pg_leads" ON public.pg_leads;
CREATE POLICY "Admin read/write pg_leads" ON public.pg_leads FOR ALL USING (auth.role() = 'authenticated');

-- ---- 9. leads (fallback / generic) ----
CREATE TABLE IF NOT EXISTS public.leads (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  phone              TEXT NOT NULL,
  rank               TEXT,
  source             TEXT,
  is_read            BOOLEAN DEFAULT false,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public insert leads" ON public.leads;
CREATE POLICY "Allow public insert leads" ON public.leads FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Admin read/write leads" ON public.leads;
CREATE POLICY "Admin read/write leads" ON public.leads FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- Done! All tables created.
-- ============================================================
