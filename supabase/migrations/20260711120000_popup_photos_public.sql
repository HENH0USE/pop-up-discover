-- Make truck-photos bucket public so photos can be served without signed URLs.
INSERT INTO storage.buckets (id, name, public)
VALUES ('truck-photos', 'truck-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow anyone to read files in the truck-photos bucket
DROP POLICY IF EXISTS "Public can read truck photos" ON storage.objects;
CREATE POLICY "Public can read truck photos"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'truck-photos');
