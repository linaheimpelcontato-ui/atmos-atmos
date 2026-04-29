ALTER TABLE public.prospects DROP CONSTRAINT prospects_source_check;
ALTER TABLE public.prospects ADD CONSTRAINT prospects_source_check 
  CHECK (source IN ('site', 'whatsapp', 'manychat', 'manual', 'import', 'calendly'));