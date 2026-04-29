
CREATE TABLE public.site_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  element_selector text NOT NULL UNIQUE,
  override_type text NOT NULL DEFAULT 'text_style',
  styles jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.site_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site_overrides" ON public.site_overrides
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Admins can manage site_overrides" ON public.site_overrides
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
