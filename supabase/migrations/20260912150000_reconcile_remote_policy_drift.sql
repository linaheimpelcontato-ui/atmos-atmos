-- PRD schema inspection found permissive policies that were never recorded in
-- migration history. PostgreSQL combines permissive policies with OR, so these
-- bypass the role checks in the canonical admin policies.
BEGIN;
DROP POLICY IF EXISTS "Public can read specific proposal" ON public.proposals;
DROP POLICY IF EXISTS "Public can read guides" ON public.guides;
DROP POLICY IF EXISTS "Admins can do everything on proposals" ON public.proposals;
DROP POLICY IF EXISTS "Admins can do everything on prospects" ON public.prospects;
DROP POLICY IF EXISTS "Admins can do all to sellers" ON public.sellers;
DROP POLICY IF EXISTS "Admins can do all to suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can mutate guides" ON public.guides;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

-- Retain the existing case-sensitive email uniqueness rule within each segment,
-- allowing the same contact to request both B2B and B2C. Do not merge or rewrite
-- historical contacts. Public request normalization/deduplication is handled by
-- sync_request_prospect under per-contact advisory locks.
ALTER TABLE public.prospects DROP CONSTRAINT IF EXISTS unique_email;
CREATE UNIQUE INDEX IF NOT EXISTS prospects_segment_email_unique
  ON public.prospects(segment, email);
COMMIT;
