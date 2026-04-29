CREATE POLICY "Public can read products"
ON public.products FOR SELECT
TO anon, authenticated
USING (true);