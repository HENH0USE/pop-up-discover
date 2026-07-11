CREATE POLICY "Owners can upload their truck photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'truck-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can update their truck photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'truck-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'truck-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can delete their truck photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'truck-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Owners can read their truck photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'truck-photos' AND (storage.foldername(name))[1] = auth.uid()::text);