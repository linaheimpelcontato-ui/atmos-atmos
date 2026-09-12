-- Run using psql -v ON_ERROR_STOP=1 after all migrations, ONLY in an isolated DB.
-- NOT EXECUTED: local Docker initialization was blocked by disk exhaustion.
BEGIN;
INSERT INTO public.products (id, name, type, is_active, cost_price, variables) VALUES
('00000000-0000-4000-8000-000000002501','Public catalog fixture','waterfall',true,987654.32,
 '{"storage_id":"public-photo","requiresGuide":"true","requires4x4":"false","cost_price":"SECRET","telefone":"SECRET","unknown":"SECRET","gallery":["public.jpg",{"private":"SECRET"}],"variations":[{"id":"visible","name":"Visible","unit_price":50,"cost_price":"SECRET","supplier_id":"SECRET","media":["v.jpg"]},{"id":"hidden","is_active":false,"name":"SECRET"}],"room_modalities":[{"unit_label":"Suite","modalities":[{"type":"duplo","capacity":2,"sale_price":100,"cost_price":"SECRET"}]}],"days":[{"day":1,"description":{"pt":"Public day","internal":"SECRET"},"items":[{"item_name":"Public item","product_name":{"pt":"Nome público","en":"Public name","secret":"SECRET"},"product_description":{"pt":"Descrição pública","secret":"SECRET"},"cost":"SECRET","supplier_id":"SECRET","product_variables":{"imageKey":"image","comissao":"SECRET","variations":[{"id":"nested","unit_price":10,"cost_price":"SECRET"}]}}]}]}'::jsonb),
('00000000-0000-4000-8000-000000002502','SECRET inactive','waterfall',false,0,'{}');
SET LOCAL ROLE anon;
DO $$ DECLARE payload jsonb; BEGIN
  IF EXISTS (SELECT 1 FROM public.products WHERE id IN ('00000000-0000-4000-8000-000000002501','00000000-0000-4000-8000-000000002502')) THEN
    RAISE EXCEPTION 'anon can read internal product rows';
  END IF;
  SELECT p INTO payload FROM jsonb_array_elements(public.get_public_products('waterfall')) p
    WHERE p->>'id' = '00000000-0000-4000-8000-000000002501';
  IF has_function_privilege('authenticated','public.public_catalog_variables(jsonb)','EXECUTE') OR has_function_privilege('anon','public.project_catalog_json(jsonb,jsonb)','EXECUTE') OR has_function_privilege('anon','public.public_catalog_variables(jsonb)','EXECUTE') OR has_function_privilege('authenticated','public.project_catalog_json(jsonb,jsonb)','EXECUTE') THEN RAISE EXCEPTION 'helpers are publicly executable'; END IF;
  IF payload IS NULL OR payload::text LIKE '%SECRET%' OR payload::text LIKE '%987654.32%' THEN RAISE EXCEPTION 'projection leaked or lost fixture'; END IF;
  IF payload#>'{variables,requiresGuide}' IS DISTINCT FROM 'true'::jsonb OR payload#>'{variables,requires4x4}' IS DISTINCT FROM 'false'::jsonb THEN RAISE EXCEPTION 'legacy flags lost'; END IF;
  IF payload#>>'{variables,days,0,description,pt}' IS DISTINCT FROM 'Public day' OR payload#>>'{variables,variations,0,unit_price}' IS DISTINCT FROM '50' THEN RAISE EXCEPTION 'public content lost'; END IF;
  IF payload#>>'{variables,days,0,items,0,product_name,pt}' IS DISTINCT FROM 'Nome público' OR payload#>>'{variables,days,0,items,0,product_description,pt}' IS DISTINCT FROM 'Descrição pública' THEN RAISE EXCEPTION 'legacy translated content lost'; END IF;
  IF jsonb_array_length(payload#>'{variables,gallery}') IS DISTINCT FROM 1 OR jsonb_array_length(payload#>'{variables,variations}') IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'untrusted array entries retained'; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(public.get_public_products()) p WHERE p->>'id' = '00000000-0000-4000-8000-000000002502') THEN RAISE EXCEPTION 'inactive product exposed'; END IF;
  IF public.get_public_products('unknown-fixture-type') IS DISTINCT FROM '[]'::jsonb THEN RAISE EXCEPTION 'type filter failed'; END IF;
END $$;
RESET ROLE;
-- An authenticated non-admin must receive the same safe projection.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000002599',true);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.products WHERE id = '00000000-0000-4000-8000-000000002501') THEN RAISE EXCEPTION 'non-admin reads internal row'; END IF;
  IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(public.get_public_products()) p WHERE p->>'id' = '00000000-0000-4000-8000-000000002501') THEN RAISE EXCEPTION 'authenticated public catalog unavailable'; END IF;
END $$;
RESET ROLE;
INSERT INTO auth.users(id,email) VALUES ('00000000-0000-4000-8000-000000002598','catalog-admin@example.invalid');
INSERT INTO public.user_roles(user_id,role) VALUES ('00000000-0000-4000-8000-000000002598','admin');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000002598',true);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = '00000000-0000-4000-8000-000000002501' AND cost_price = 987654.32) THEN RAISE EXCEPTION 'admin internal access lost'; END IF;
  UPDATE public.products SET name = 'Admin can edit fixture' WHERE id = '00000000-0000-4000-8000-000000002501';
  IF NOT FOUND THEN RAISE EXCEPTION 'admin update lost'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
