ALTER TABLE public.proposal_day_items
  ADD COLUMN IF NOT EXISTS cost_price numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_percent numeric NOT NULL DEFAULT 0;

UPDATE public.proposal_day_items pdi
SET
  cost_price = COALESCE(p.cost_price, 0),
  commission_percent = COALESCE((p.variables->>'comissao')::numeric, 0)
FROM public.products p
WHERE pdi.catalog_item_id = p.id
  AND pdi.cost_price = 0;