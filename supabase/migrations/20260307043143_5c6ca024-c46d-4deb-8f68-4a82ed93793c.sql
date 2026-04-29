
ALTER TABLE public.guides
  ADD COLUMN IF NOT EXISTS residence text,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS has_4x4 boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS languages text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS is_kalunga boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS has_cadastur boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guide_prices jsonb DEFAULT '{"carroTurista":{"1":0,"2":0,"3plus":0},"4x4Atmos":{"1":0,"2":0,"3plus":0}}'::jsonb;
