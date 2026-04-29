
-- Add B2B-specific columns to prospects
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS company_type text,
  ADD COLUMN IF NOT EXISTS company_segment text,
  ADD COLUMN IF NOT EXISTS estimated_ticket numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS annual_volume integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS typical_group_size integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS operates_brazil text DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS brazil_destinations text,
  ADD COLUMN IF NOT EXISTS commission_rate numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS key_clients text,
  ADD COLUMN IF NOT EXISTS differentials text,
  ADD COLUMN IF NOT EXISTS strategic_notes text,
  ADD COLUMN IF NOT EXISTS logo_url text;
