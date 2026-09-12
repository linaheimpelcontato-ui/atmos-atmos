-- The assets bucket is public for reading; publishing/replacing/removing site
-- media must not be allowed to every signed-in customer.
BEGIN;
DROP POLICY IF EXISTS "Authenticated upload for assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update for assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete for assets" ON storage.objects;
CREATE POLICY "Admin upload for assets" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id='assets' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin update for assets" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id='assets' AND public.has_role(auth.uid(),'admin'))
  WITH CHECK (bucket_id='assets' AND public.has_role(auth.uid(),'admin'));
CREATE POLICY "Admin delete for assets" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id='assets' AND public.has_role(auth.uid(),'admin'));
COMMIT;
