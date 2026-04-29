
CREATE TABLE public.guide_waterfall_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.guides(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT false,
  price_car_1 numeric NOT NULL DEFAULT 0,
  price_car_2 numeric NOT NULL DEFAULT 0,
  price_car_3plus numeric NOT NULL DEFAULT 0,
  price_4x4_1 numeric NOT NULL DEFAULT 0,
  price_4x4_2 numeric NOT NULL DEFAULT 0,
  price_4x4_3plus numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(guide_id, product_id)
);

ALTER TABLE public.guide_waterfall_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage guide_waterfall_prices"
  ON public.guide_waterfall_prices
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
