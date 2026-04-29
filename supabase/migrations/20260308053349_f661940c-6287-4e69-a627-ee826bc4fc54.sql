
-- Create bank_accounts table
CREATE TABLE public.bank_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  bank TEXT NOT NULL DEFAULT '',
  agency TEXT DEFAULT '',
  account_number TEXT DEFAULT '',
  account_type TEXT NOT NULL DEFAULT 'checking',
  initial_balance NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create branches table
CREATE TABLE public.branches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  cnpj TEXT DEFAULT '',
  address TEXT DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

-- RLS policies for bank_accounts (admin only)
CREATE POLICY "Admins can manage bank_accounts" ON public.bank_accounts
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS policies for branches (admin only)
CREATE POLICY "Admins can manage branches" ON public.branches
  FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Add new columns to financial_transactions
ALTER TABLE public.financial_transactions
  ADD COLUMN bank_account_id UUID REFERENCES public.bank_accounts(id) DEFAULT NULL,
  ADD COLUMN branch_id UUID REFERENCES public.branches(id) DEFAULT NULL,
  ADD COLUMN payment_method TEXT DEFAULT NULL,
  ADD COLUMN installment_number INTEGER DEFAULT NULL,
  ADD COLUMN installment_total INTEGER DEFAULT NULL,
  ADD COLUMN prospect_id UUID REFERENCES public.prospects(id) DEFAULT NULL;
