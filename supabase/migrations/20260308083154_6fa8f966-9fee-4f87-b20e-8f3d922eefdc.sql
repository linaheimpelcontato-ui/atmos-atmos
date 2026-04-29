CREATE POLICY "Public can read sellers for proposals"
ON public.sellers FOR SELECT
TO anon, authenticated
USING (true);