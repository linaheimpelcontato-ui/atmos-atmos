-- Local/homologation only. Real persisted values and RLS; all fixtures roll back.
BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'prospects'
      AND column_name = 'city' AND data_type = 'text' AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'Apply 20260922160000_prospects_city first';
  END IF;
END $$;

CREATE TEMP TABLE city_test_ids (admin_id uuid DEFAULT gen_random_uuid(), prospect_id uuid DEFAULT gen_random_uuid());
INSERT INTO city_test_ids DEFAULT VALUES;
GRANT SELECT ON city_test_ids TO authenticated;
INSERT INTO auth.users(id,email) SELECT admin_id, admin_id::text || '@example.invalid' FROM city_test_ids;
INSERT INTO public.user_roles(user_id,role) SELECT admin_id, 'admin' FROM city_test_ids;
-- Simulate a pre-migration row: the added nullable field must not require backfill.
INSERT INTO public.prospects(id,name,segment,notes)
SELECT prospect_id, 'LOCAL CITY TEST', 'b2c', 'preservar' FROM city_test_ids;
SELECT set_config('request.jwt.claim.sub', admin_id::text, true) FROM city_test_ids;
SELECT set_config('request.jwt.claims', jsonb_build_object('sub',admin_id,'role','authenticated')::text, true) FROM city_test_ids;
SET LOCAL ROLE authenticated;

UPDATE public.prospects SET city = 'Alto Paraíso de Goiás', name = 'LOCAL CITY SAVED', segment = 'b2b'
WHERE id = (SELECT prospect_id FROM city_test_ids);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.prospects WHERE id = (SELECT prospect_id FROM city_test_ids)
    AND city = 'Alto Paraíso de Goiás' AND name = 'LOCAL CITY SAVED' AND segment = 'b2b' AND notes = 'preservar') THEN
    RAISE EXCEPTION 'City and client changes did not persist together';
  END IF;
END $$;
UPDATE public.prospects SET city = NULL WHERE id = (SELECT prospect_id FROM city_test_ids);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.prospects WHERE id = (SELECT prospect_id FROM city_test_ids)
    AND city IS NULL AND name = 'LOCAL CITY SAVED' AND notes = 'preservar') THEN
    RAISE EXCEPTION 'Clearing city lost other client fields';
  END IF;
END $$;

RESET ROLE;
ROLLBACK;
