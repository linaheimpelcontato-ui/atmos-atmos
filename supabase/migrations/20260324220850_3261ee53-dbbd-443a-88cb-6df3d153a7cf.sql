CREATE OR REPLACE FUNCTION public.sync_product_to_draft_proposals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF (OLD.cost_price IS DISTINCT FROM NEW.cost_price) 
     OR (OLD.unit_price IS DISTINCT FROM NEW.unit_price)
     OR (OLD.variables->>'comissao' IS DISTINCT FROM NEW.variables->>'comissao') THEN
    
    UPDATE proposal_day_items pdi
    SET 
      cost_price = NEW.cost_price,
      value = NEW.unit_price,
      commission_percent = COALESCE((NEW.variables->>'comissao')::numeric, 0)
    FROM proposals p
    WHERE pdi.catalog_item_id = NEW.id
      AND pdi.proposal_id = p.id
      AND p.status = 'draft';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_product_to_drafts
AFTER UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.sync_product_to_draft_proposals();