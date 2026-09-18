-- Keep the visitor's submitted questionnaire separate from proposal-derived values.
-- Proposal editing may normalize operational fields (for example, unknown group size
-- to one paying person), but the original public request must remain auditable.
ALTER TABLE public.quote_requests
  ADD COLUMN IF NOT EXISTS original_answers jsonb;

UPDATE public.quote_requests
SET original_answers = answers
WHERE original_answers IS NULL;

CREATE OR REPLACE FUNCTION public.capture_original_quote_answers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.original_answers := COALESCE(NEW.original_answers, NEW.answers);
  ELSE
    NEW.original_answers := COALESCE(OLD.original_answers, OLD.answers, NEW.answers);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.capture_original_quote_answers() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.capture_original_quote_answers() TO anon, authenticated;

DROP TRIGGER IF EXISTS trg_capture_original_quote_answers ON public.quote_requests;
CREATE TRIGGER trg_capture_original_quote_answers
BEFORE INSERT OR UPDATE ON public.quote_requests
FOR EACH ROW EXECUTE FUNCTION public.capture_original_quote_answers();
