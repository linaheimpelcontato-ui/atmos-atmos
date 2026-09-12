CREATE TABLE public.site_text_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pathname text NOT NULL CHECK (left(pathname,1)='/' AND length(pathname)<=500),
  language text NOT NULL CHECK (language IN ('pt','en','es')),
  element_selector text NOT NULL CHECK (length(element_selector) BETWEEN 1 AND 500),
  device text NOT NULL CHECK (device IN ('all','desktop','mobile')),
  original_text text NOT NULL CHECK (length(original_text)<=10000),
  content text NOT NULL CHECK (length(content)<=10000),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pathname,language,element_selector,device)
);
ALTER TABLE public.site_text_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public site text" ON public.site_text_overrides FOR SELECT TO anon,authenticated USING(true);
CREATE POLICY "Admin site text" ON public.site_text_overrides FOR ALL TO authenticated
  USING(public.has_role(auth.uid(),'admin')) WITH CHECK(public.has_role(auth.uid(),'admin'));
GRANT SELECT ON public.site_text_overrides TO anon,authenticated;
GRANT INSERT,UPDATE,DELETE ON public.site_text_overrides TO authenticated;
