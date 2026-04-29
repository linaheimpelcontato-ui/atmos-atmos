DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'prospect_interactions_type_check' 
    AND table_name = 'prospect_interactions'
  ) THEN
    ALTER TABLE public.prospect_interactions DROP CONSTRAINT prospect_interactions_type_check;
  END IF;
END $$;

ALTER TABLE public.prospect_interactions 
ADD CONSTRAINT prospect_interactions_type_check 
CHECK (type IN ('note', 'call', 'email', 'whatsapp', 'stage_change', 'meeting', 'linkedin', 'reuniao_reagendada', 'reuniao_cancelada'));