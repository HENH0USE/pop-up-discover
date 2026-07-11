CREATE POLICY "Public can read popup photos"
ON storage.objects FOR SELECT TO anon, authenticated
USING (bucket_id = 'truck-photos');

CREATE POLICY "Owners can upload their popup photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'truck-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can update their popup photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'truck-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'truck-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can delete their popup photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'truck-photos' AND (storage.foldername(name))[1] = auth.uid()::text);