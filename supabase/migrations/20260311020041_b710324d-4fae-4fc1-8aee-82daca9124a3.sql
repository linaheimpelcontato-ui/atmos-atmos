
-- Create suppliers table
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact_name text DEFAULT '',
  phone text DEFAULT '',
  email text DEFAULT '',
  instagram text DEFAULT '',
  website text DEFAULT '',
  cnpj text DEFAULT '',
  pix_key text DEFAULT '',
  bank_name text DEFAULT '',
  bank_agency text DEFAULT '',
  bank_account text DEFAULT '',
  payment_terms text DEFAULT '',
  notes text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage suppliers"
  ON public.suppliers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add supplier_id to products
ALTER TABLE public.products ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Updated_at trigger
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
