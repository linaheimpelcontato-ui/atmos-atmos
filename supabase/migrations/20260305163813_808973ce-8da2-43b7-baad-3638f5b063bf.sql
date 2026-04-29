-- Create public assets bucket for images
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', true);

-- Allow public read access
CREATE POLICY "Public read access for assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'assets');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated upload for assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assets');

-- Allow authenticated users to update
CREATE POLICY "Authenticated update for assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'assets');

-- Allow authenticated users to delete
CREATE POLICY "Authenticated delete for assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'assets');