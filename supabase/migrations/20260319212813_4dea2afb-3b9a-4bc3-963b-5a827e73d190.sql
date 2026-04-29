
CREATE TABLE public.map_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  point_type text NOT NULL DEFAULT 'waterfall',
  x numeric NOT NULL DEFAULT 50,
  y numeric NOT NULL DEFAULT 50,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  icon_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.map_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage map_points" ON public.map_points
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read active map_points" ON public.map_points
  FOR SELECT TO anon, authenticated
  USING (is_active = true);
