-- Bank statements are evidence for reconciliation, not automatic payment.
-- Matching a line must never silently mark a financial transaction as paid.
CREATE TABLE public.bank_reconciliation_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id) ON DELETE CASCADE,
  external_id text,
  transaction_date date NOT NULL,
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL CHECK (amount >= 0),
  direction text NOT NULL CHECK (direction IN ('credit', 'debit')),
  transaction_id uuid REFERENCES public.financial_transactions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'unmatched' CHECK (status IN ('unmatched', 'matched', 'ignored')),
  imported_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX bank_reconciliation_lines_account_date_idx
  ON public.bank_reconciliation_lines(bank_account_id, transaction_date);
CREATE INDEX bank_reconciliation_lines_transaction_idx
  ON public.bank_reconciliation_lines(transaction_id);
CREATE UNIQUE INDEX bank_reconciliation_lines_external_id_idx
  ON public.bank_reconciliation_lines(bank_account_id, external_id)
  WHERE external_id IS NOT NULL AND btrim(external_id) <> '';

ALTER TABLE public.bank_reconciliation_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage bank_reconciliation_lines"
  ON public.bank_reconciliation_lines FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
