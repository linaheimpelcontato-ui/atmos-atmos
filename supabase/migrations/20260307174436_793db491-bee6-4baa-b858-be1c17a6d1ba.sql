
-- 1. Create sellers table
CREATE TABLE public.sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sellers" ON public.sellers
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. Add seller_id to proposals
ALTER TABLE public.proposals ADD COLUMN seller_id uuid REFERENCES public.sellers(id);

-- 3. Add seller_id to prospects
ALTER TABLE public.prospects ADD COLUMN seller_id uuid REFERENCES public.sellers(id);

-- 4. Create sales_goals table
CREATE TABLE public.sales_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid REFERENCES public.sellers(id),
  period_type text NOT NULL DEFAULT 'monthly',
  period_start date NOT NULL,
  goal_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sales_goals" ON public.sales_goals
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. updated_at triggers
CREATE TRIGGER update_sellers_updated_at BEFORE UPDATE ON public.sellers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_goals_updated_at BEFORE UPDATE ON public.sales_goals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
