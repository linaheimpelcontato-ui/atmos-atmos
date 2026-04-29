
-- Add new columns to prospects
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'direct',
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS target_market text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS potential text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS first_contact timestamp with time zone,
  ADD COLUMN IF NOT EXISTS last_interaction timestamp with time zone,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS linkedin text,
  ADD COLUMN IF NOT EXISTS instagram text;

-- Add new columns to proposals
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS num_people integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS num_days integer DEFAULT 1;

-- Contacts table
CREATE TABLE public.contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  name text NOT NULL,
  role text,
  email text,
  phone text,
  linkedin text,
  best_channel text DEFAULT 'email',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage contacts" ON public.contacts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Catalog items table
CREATE TABLE public.catalog_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category text NOT NULL,
  name text NOT NULL,
  default_price numeric NOT NULL DEFAULT 0,
  segment text NOT NULL DEFAULT 'b2c',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.catalog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage catalog_items" ON public.catalog_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Default prices table
CREATE TABLE public.default_prices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name text NOT NULL UNIQUE,
  unit_price numeric NOT NULL DEFAULT 0,
  category text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.default_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage default_prices" ON public.default_prices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Proposal day items (grid)
CREATE TABLE public.proposal_day_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  day_number integer NOT NULL DEFAULT 1,
  day_label text,
  category text NOT NULL,
  item_name text,
  item_index integer NOT NULL DEFAULT 0,
  value numeric NOT NULL DEFAULT 0,
  value_text text,
  description text,
  catalog_item_id uuid REFERENCES public.catalog_items(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.proposal_day_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage proposal_day_items" ON public.proposal_day_items FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Email templates table
CREATE TABLE public.email_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  segment text NOT NULL DEFAULT 'b2c',
  language text NOT NULL DEFAULT 'pt',
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage email_templates" ON public.email_templates FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
