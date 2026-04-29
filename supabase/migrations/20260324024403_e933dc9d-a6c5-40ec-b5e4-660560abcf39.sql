
-- Auto-set contract_status and payment_status to 'pending' when status changes to 'approved'
CREATE OR REPLACE FUNCTION public.auto_pending_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    IF NEW.contract_status IS NULL THEN
      NEW.contract_status := 'pending';
    END IF;
    IF NEW.payment_status IS NULL THEN
      NEW.payment_status := 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_pending_on_approval
  BEFORE UPDATE ON public.proposals
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_pending_on_approval();
