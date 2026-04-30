-- Add variation_id and supplier_id to proposal_day_items
ALTER TABLE public.proposal_day_items 
  ADD COLUMN IF NOT EXISTS variation_id uuid,
  ADD COLUMN IF NOT EXISTS supplier_id uuid;

-- Update the sync trigger function to be variation-aware
CREATE OR REPLACE FUNCTION public.sync_product_to_draft_proposals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- We trigger when cost, price, commission or variations change
  IF (OLD.cost_price IS DISTINCT FROM NEW.cost_price) 
     OR (OLD.unit_price IS DISTINCT FROM NEW.unit_price)
     OR (OLD.variables->>'comissao' IS DISTINCT FROM NEW.variables->>'comissao')
     OR (OLD.variables->'variations' IS DISTINCT FROM NEW.variables->'variations') THEN
    
    -- Update items that DON'T have a variation (use parent product prices)
    UPDATE proposal_day_items pdi
    SET 
      cost_price = CASE 
        WHEN (NEW.variables->>'pricingType' = 'total'
              OR (NEW.category IN ('transfer','drone')
                  AND COALESCE(NEW.variables->>'pricingType','') = ''))
        THEN ROUND(NEW.cost_price / GREATEST(p.num_people, 1), 2)
        ELSE NEW.cost_price
      END,
      value = CASE 
        WHEN (NEW.variables->>'pricingType' = 'total'
              OR (NEW.category IN ('transfer','drone')
                  AND COALESCE(NEW.variables->>'pricingType','') = ''))
        THEN ROUND(NEW.unit_price / GREATEST(p.num_people, 1), 2)
        ELSE NEW.unit_price
      END,
      commission_percent = COALESCE((NEW.variables->>'comissao')::numeric, 0),
      supplier_id = COALESCE(pdi.supplier_id, NEW.supplier_id)
    FROM proposals p
    WHERE pdi.catalog_item_id = NEW.id
      AND pdi.proposal_id = p.id
      AND p.status = 'draft'
      AND pdi.variation_id IS NULL;

    -- Update items that HAVE a variation
    UPDATE proposal_day_items pdi
    SET
      cost_price = sub.new_cost,
      value = sub.new_value,
      item_name = sub.new_name,
      supplier_id = COALESCE(sub.new_supplier, NEW.supplier_id)
    FROM (
      SELECT 
        pdi.id as pdi_id,
        (v->>'cost_price')::numeric as new_cost,
        (v->>'unit_price')::numeric as new_value,
        v->>'name' as new_name,
        (v->>'supplier_id')::uuid as new_supplier
      FROM proposal_day_items pdi
      JOIN proposals p ON pdi.proposal_id = p.id
      CROSS JOIN LATERAL jsonb_array_elements(NEW.variables->'variations') v
      WHERE pdi.catalog_item_id = NEW.id
        AND p.status = 'draft'
        AND pdi.variation_id IS NOT NULL
        AND (v->>'id')::uuid = pdi.variation_id
    ) sub
    WHERE pdi.id = sub.pdi_id;

  END IF;
  RETURN NEW;
END;
$function$;
