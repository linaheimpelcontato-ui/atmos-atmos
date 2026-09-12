-- Manual transaction traceability. No historical values are inferred or backfilled.
-- Existing financial_transactions admin RLS remains in force.
ALTER TABLE public.financial_transactions
  ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  ADD COLUMN invoice_number text,
  ADD COLUMN competence_date date;

CREATE INDEX financial_transactions_supplier_id_idx ON public.financial_transactions(supplier_id);
CREATE INDEX financial_transactions_competence_date_idx ON public.financial_transactions(competence_date);

COMMENT ON COLUMN public.financial_transactions.supplier_id IS 'Supplier linked to the transaction; inactive suppliers remain available for historical records.';
COMMENT ON COLUMN public.financial_transactions.invoice_number IS 'Document number entered by staff; text preserves leading zeroes. No fiscal validation is implied.';
COMMENT ON COLUMN public.financial_transactions.competence_date IS 'Competence date entered by staff, independent of due_date and paid_date. NULL means not informed.';
