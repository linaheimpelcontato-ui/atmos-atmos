
CREATE TABLE public.image_focal_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_path text NOT NULL UNIQUE,
  focal_x numeric NOT NULL DEFAULT 50,
  focal_y numeric NOT NULL DEFAULT 50,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.image_focal_points ENABLE ROW LEVEL SECURITY;

-- Public can read (frontend needs it)
CREATE POLICY "Anyone can read focal points"
  ON public.image_focal_points FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only admins can write
CREATE POLICY "Admins can manage focal points"
  ON public.image_focal_points FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
