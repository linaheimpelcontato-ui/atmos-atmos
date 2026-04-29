
ALTER TABLE public.proposals 
  ADD COLUMN IF NOT EXISTS contract_status text,
  ADD COLUMN IF NOT EXISTS payment_status text;

ALTER TABLE public.prospect_interactions 
  DROP CONSTRAINT IF EXISTS prospect_interactions_type_check;

ALTER TABLE public.prospect_interactions 
  ADD CONSTRAINT prospect_interactions_type_check 
  CHECK (type = ANY (ARRAY['note', 'call', 'email', 'whatsapp', 'stage_change', 'meeting', 'linkedin', 'reuniao_reagendada', 'reuniao_cancelada', 'approval']));
