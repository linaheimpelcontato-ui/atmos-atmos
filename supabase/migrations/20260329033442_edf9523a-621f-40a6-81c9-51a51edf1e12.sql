CREATE OR REPLACE FUNCTION public.sync_product_to_draft_proposals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF (OLD.cost_price IS DISTINCT FROM NEW.cost_price) 
     OR (OLD.unit_price IS DISTINCT FROM NEW.unit_price)
     OR (OLD.variables->>'comissao' IS DISTINCT FROM NEW.variables->>'comissao') THEN
    
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
      commission_percent = COALESCE((NEW.variables->>'comissao')::numeric, 0)
    FROM proposals p
    WHERE pdi.catalog_item_id = NEW.id
      AND pdi.proposal_id = p.id
      AND p.status = 'draft';
  END IF;
  RETURN NEW;
END;
$function$;