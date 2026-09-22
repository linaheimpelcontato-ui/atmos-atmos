-- The client editor/import have sent city since 0aa8f1a, but prospects never
-- acquired the column. Even city: null makes PostgREST reject the whole patch.
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS city text;

COMMENT ON COLUMN public.prospects.city IS 'Cidade do cliente ou da empresa.';

-- Refresh the REST schema after committing the additive change.
NOTIFY pgrst, 'reload schema';
