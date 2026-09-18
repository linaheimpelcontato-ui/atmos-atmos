-- Operational proposal costs must be attributable to the supplier who will
-- receive the money. The field is nullable to preserve historical costs that
-- cannot be reconstructed without inventing a supplier.
ALTER TABLE public.proposal_costs
  ADD COLUMN supplier_id uuid REFERENCES public.suppliers(id) ON DELETE SET NULL;

CREATE INDEX proposal_costs_supplier_id_idx ON public.proposal_costs(supplier_id);

COMMENT ON COLUMN public.proposal_costs.supplier_id IS
  'Supplier expected to receive this operational proposal cost; NULL means historical or not informed.';
