-- Migration: 001_media_assets
-- Description: Create media_assets table and storage bucket for CMS image management

-- Create the media_assets table
CREATE TABLE IF NOT EXISTS public.media_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  media_key VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(255),
  image_url TEXT NOT NULL,
  mobile_image_url TEXT,
  alt_text TEXT,
  section_type VARCHAR(100), -- values: hero, content, college, marketing
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

-- Public read policy: anyone can read all media assets
CREATE POLICY "Public can view all media assets"
  ON public.media_assets
  FOR SELECT
  USING (true);

-- Authenticated users full CRUD policy
CREATE POLICY "Authenticated users have full access to media assets"
  ON public.media_assets
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to media_assets
CREATE TRIGGER update_media_assets_updated_at
  BEFORE UPDATE ON public.media_assets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create the media-assets storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('media-assets', 'media-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for media-assets bucket

-- Anyone can view/download files (public read)
CREATE POLICY "Public can view media assets files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'media-assets');

-- Authenticated users can upload files
CREATE POLICY "Authenticated users can upload media assets"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'media-assets'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can update files
CREATE POLICY "Authenticated users can update media assets"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'media-assets'
    AND auth.role() = 'authenticated'
  )
  WITH CHECK (
    bucket_id = 'media-assets'
    AND auth.role() = 'authenticated'
  );

-- Authenticated users can delete files
CREATE POLICY "Authenticated users can delete media assets"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'media-assets'
    AND auth.role() = 'authenticated'
  );
