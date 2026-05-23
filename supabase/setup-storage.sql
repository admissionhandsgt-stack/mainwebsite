
-- Create storage buckets for colleges and universities images
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('colleges', 'colleges', true),
  ('universities', 'universities', true);

-- Allow public read access to the buckets
CREATE POLICY "Allow public read access on colleges images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'colleges');

CREATE POLICY "Allow public read access on universities images" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'universities');

-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload college images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'colleges');

CREATE POLICY "Allow authenticated users to update college images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'colleges');
  
CREATE POLICY "Allow authenticated users to delete college images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'colleges');

CREATE POLICY "Allow authenticated users to upload university images" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'universities');
  
CREATE POLICY "Allow authenticated users to update university images" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'universities');
  
CREATE POLICY "Allow authenticated users to delete university images" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'universities');
