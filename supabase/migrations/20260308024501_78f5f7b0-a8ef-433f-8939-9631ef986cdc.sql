
-- Add sequential code column to proposals
ALTER TABLE public.proposals ADD COLUMN IF NOT EXISTS code TEXT UNIQUE;

-- Create function to auto-generate ATMOS-XXXX code
CREATE OR REPLACE FUNCTION public.generate_proposal_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(
    CASE WHEN code ~ '^ATMOS-[0-9]+$'
      THEN CAST(SUBSTRING(code FROM 7) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1 INTO next_num FROM public.proposals;
  
  NEW.code := 'ATMOS-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_proposal_code ON public.proposals;
CREATE TRIGGER trg_proposal_code
  BEFORE INSERT ON public.proposals
  FOR EACH ROW
  WHEN (NEW.code IS NULL)
  EXECUTE FUNCTION public.generate_proposal_code();

-- Backfill existing proposals without code
DO $$
DECLARE
  r RECORD;
  i INTEGER := 0;
BEGIN
  FOR r IN SELECT id FROM public.proposals WHERE code IS NULL ORDER BY created_at LOOP
    i := i + 1;
    UPDATE public.proposals SET code = 'ATMOS-' || LPAD(i::TEXT, 4, '0') WHERE id = r.id;
  END LOOP;
END;
$$;
