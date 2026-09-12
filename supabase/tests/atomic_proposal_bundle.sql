-- Run only against a disposable LOCAL database with migrations applied.
-- psql -v ON_ERROR_STOP=1 -f supabase/tests/atomic_proposal_bundle.sql
BEGIN;
-- Connection role only provisions fixtures; all RPC exercises below use application roles.
CREATE TEMP TABLE bundle_test_context(admin_id uuid, non_admin_id uuid, proposal_id uuid) ON COMMIT DROP;
INSERT INTO bundle_test_context(admin_id, non_admin_id) VALUES (gen_random_uuid(), gen_random_uuid());
INSERT INTO auth.users(id, email)
  SELECT admin_id, admin_id::text || '@example.invalid' FROM bundle_test_context
  UNION ALL SELECT non_admin_id, non_admin_id::text || '@example.invalid' FROM bundle_test_context;
INSERT INTO public.user_roles(user_id, role) SELECT admin_id, 'admin' FROM bundle_test_context;
GRANT SELECT, UPDATE ON bundle_test_context TO authenticated;
SELECT set_config('request.jwt.claim.sub', (SELECT admin_id::text FROM bundle_test_context), true);
SELECT set_config('request.jwt.claims', (SELECT jsonb_build_object('sub', admin_id, 'role', 'authenticated')::text FROM bundle_test_context), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE

  product uuid := gen_random_uuid();
  accommodation uuid := gen_random_uuid();
  proposal uuid;
  tx uuid;
  item_id uuid;
  day_id uuid;
  days jsonb := '[{"day_number":1,"description":"Original description"}]';
  payload jsonb := '{"title":"Atomic fixture","status":"draft","segment":"b2c","subtotal":0,"discount_percent":0,"discount_fixed":0,"tax_percent":0,"total":0,"num_people":20,"num_days":1,"language":"pt","atmos_service":{}}';
  items jsonb := '[{"day_number":1,"day_label":"Day 1","category":"Serviços","item_name":"Zero negotiated cost","value":10,"item_index":0,"quantity":1,"cost_price":0,"commission_percent":0}]';
  accommodations jsonb;
  commissions jsonb;
  result jsonb;
  rejected boolean;
  invalid_commissions jsonb;
  other_proposal uuid;
  cancelled_proposal uuid;
  cancelled_accommodation uuid := gen_random_uuid();
  cancelled_tx uuid;
  cancelled_accommodations jsonb;
  cancelled_commissions jsonb;
  retry_amount numeric;
BEGIN
  IF current_user IS DISTINCT FROM 'authenticated' THEN RAISE EXCEPTION 'Admin RPC must run as authenticated'; END IF;
  IF (SELECT prosecdef FROM pg_proc WHERE oid = 'public.save_proposal_bundle(uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)'::regprocedure) IS DISTINCT FROM false THEN RAISE EXCEPTION 'RPC must use SECURITY INVOKER'; END IF;
  INSERT INTO public.products(id, name, type, variables, cost_price) VALUES (product, 'Fixture accommodation', 'accommodation', '{"comissao":10}', 100);
  items := jsonb_set(items, '{0,catalog_item_id}', to_jsonb(product));
  accommodations := jsonb_build_array(jsonb_build_object('id', accommodation, 'product_id', product,
    'num_nights', 1, 'notes', '', 'is_selected', true, 'payment_type', 'hospedagem', 'rooms',
    '[{"unit_label":"Fixture","rooms":[{"type":"single","available":true,"units":1,"capacity":1,"pricing_type":"per_room","cost":0.05,"price":0.05,"commission_percent":10},{"type":"single","available":true,"units":1,"capacity":1,"pricing_type":"per_room","cost":0.05,"price":0.05,"commission_percent":10}]}]'::jsonb));
  commissions := jsonb_build_array(jsonb_build_object('source_key', 'accommodation:' || accommodation,
    'description', 'Comissão hospedagem: fixture', 'amount', 0.01, 'due_date', '2026-09-11'));
  result := public.save_proposal_bundle(NULL, payload, items, '[]', days, accommodations, commissions);
  proposal := (result->>'id')::uuid;
  IF jsonb_array_length(result#>'{child_ids,items}') IS DISTINCT FROM 1
    OR jsonb_array_length(result#>'{child_ids,costs}') IS DISTINCT FROM 0
    OR jsonb_array_length(result#>'{child_ids,days}') IS DISTINCT FROM 1
    OR result#>>'{child_ids,accommodations,0}' IS DISTINCT FROM accommodation::text THEN RAISE EXCEPTION 'Generated child IDs missing from result'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.proposal_day_items WHERE id = (result#>>'{child_ids,items,0}')::uuid AND proposal_id = proposal) THEN RAISE EXCEPTION 'Returned item ID is not persisted'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.proposal_days WHERE id = (result#>>'{child_ids,days,0}')::uuid AND proposal_id = proposal) THEN RAISE EXCEPTION 'Returned day ID is not persisted'; END IF;

  IF EXISTS(SELECT 1 FROM public.proposals p WHERE p.id = proposal AND to_jsonb(p) ? 'show_price_breakdown'
    AND (to_jsonb(p)->>'show_price_breakdown')::boolean IS NOT FALSE) THEN RAISE EXCEPTION 'CREATE omitted toggle did not use false default'; END IF;
  IF (SELECT cost_price FROM public.proposal_day_items WHERE proposal_id = proposal) IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'Zero cost not preserved'; END IF;
  SELECT id INTO STRICT item_id FROM public.proposal_day_items WHERE proposal_id = proposal;
  items := jsonb_set(items, '{0,id}', to_jsonb(item_id));
  UPDATE public.proposal_day_items SET start_time = '08:30', end_time = '10:00' WHERE id = item_id;
  SELECT id INTO STRICT day_id FROM public.proposal_days WHERE proposal_id = proposal;
  UPDATE public.proposal_days SET observation = 'Public observation retained' WHERE id = day_id;
  UPDATE public.proposals SET contract_url = 'https://example.invalid/contract' WHERE id = proposal;
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'show_price_breakdown') THEN
    EXECUTE 'UPDATE public.proposals SET show_price_breakdown = true WHERE id = $1' USING proposal;
  END IF;
  SELECT id INTO STRICT tx FROM public.financial_transactions WHERE proposal_id = proposal;
  IF (SELECT amount FROM public.financial_transactions WHERE id = tx) IS DISTINCT FROM 0.01 THEN RAISE EXCEPTION 'Commission total mismatch'; END IF;

  UPDATE public.products SET variables = '{"comissao":20}', cost_price = 999 WHERE id = product;
  PERFORM public.save_proposal_bundle(proposal, payload, items, '[]', days, accommodations, commissions);
  IF (SELECT rooms#>>'{0,rooms,0,commission_percent}' FROM public.proposal_accommodations WHERE id = accommodation) IS DISTINCT FROM '10' THEN RAISE EXCEPTION 'Historical snapshot changed'; END IF;
  IF (SELECT cost_price FROM public.proposal_day_items WHERE proposal_id = proposal) IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'Catalog overwrote zero cost'; END IF;
  IF (SELECT count(*) FROM public.financial_transactions WHERE proposal_id = proposal) IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Retry duplicated commission'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.proposal_day_items WHERE id = item_id AND start_time = '08:30' AND end_time = '10:00') THEN RAISE EXCEPTION 'Item identity/time lost'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.proposal_days WHERE id = day_id AND observation = 'Public observation retained') THEN RAISE EXCEPTION 'Day identity/observation lost'; END IF;
  IF (SELECT contract_url FROM public.proposals WHERE id = proposal) IS DISTINCT FROM 'https://example.invalid/contract' THEN RAISE EXCEPTION 'Unedited proposal field lost'; END IF;
  IF EXISTS(SELECT 1 FROM public.proposals p WHERE p.id = proposal AND to_jsonb(p) ? 'show_price_breakdown' AND (to_jsonb(p)->>'show_price_breakdown')::boolean IS NOT TRUE) THEN RAISE EXCEPTION 'Public detail toggle overwritten'; END IF;


  accommodations := jsonb_set(accommodations, '{0,rooms,0,rooms,0,commission_percent}', '0');
  PERFORM public.save_proposal_bundle(proposal, payload, items, '[]', days, accommodations, commissions);
  IF (SELECT rooms#>>'{0,rooms,0,commission_percent}' FROM public.proposal_accommodations WHERE id = accommodation) IS DISTINCT FROM '0' THEN RAISE EXCEPTION 'Zero commission snapshot lost'; END IF;

  UPDATE public.financial_transactions SET status = 'paid', paid_date = '2026-09-10', notes = 'reconciled fixture' WHERE id = tx;
  PERFORM public.save_proposal_bundle(proposal, payload, items, '[]', days, accommodations, commissions);
  IF NOT EXISTS(SELECT 1 FROM public.financial_transactions WHERE id = tx AND status = 'paid' AND paid_date = '2026-09-10' AND notes = 'reconciled fixture') THEN RAISE EXCEPTION 'Paid receipt was reset'; END IF;

  rejected := false;
  BEGIN
    PERFORM public.save_proposal_bundle(proposal, payload || '{"title":"Must rollback"}', items, '[]', days, accommodations,
      jsonb_set(commissions, '{0,amount}', '0.02'));
  EXCEPTION WHEN OTHERS THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Paid commission change was allowed'; END IF;
  IF (SELECT title FROM public.proposals WHERE id = proposal) IS DISTINCT FROM 'Atomic fixture' THEN RAISE EXCEPTION 'Paid-change rejection did not roll back proposal'; END IF;

  rejected := false;
  BEGIN
    PERFORM public.save_proposal_bundle(proposal, payload || '{"title":"Must rollback items"}',
      jsonb_set(items, '{0,category}', 'null'), '[]', days, accommodations, commissions);
  EXCEPTION WHEN not_null_violation THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Invalid child did not fail'; END IF;
  IF (SELECT title FROM public.proposals WHERE id = proposal) IS DISTINCT FROM 'Atomic fixture' OR
     (SELECT count(*) FROM public.proposal_day_items WHERE proposal_id = proposal) IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Partial save survived failure'; END IF;

  INSERT INTO public.financial_transactions(proposal_id, type, description, amount, due_date, status, paid_date)
    VALUES (proposal, 'receivable', 'Comissão hospedagem: legacy', 123, '2026-09-11', 'paid', '2026-09-10');
  result := public.save_proposal_bundle(proposal, payload, items, '[]', days, accommodations, commissions);
  IF (result->>'legacy_commissions')::boolean IS DISTINCT FROM true THEN RAISE EXCEPTION 'Legacy warning missing'; END IF;
  IF (SELECT count(*) FROM public.financial_transactions WHERE proposal_id = proposal) IS DISTINCT FROM 2 OR
     NOT EXISTS(SELECT 1 FROM public.financial_transactions WHERE proposal_id = proposal AND source_key IS NULL AND status = 'paid' AND amount = 123) THEN RAISE EXCEPTION 'Legacy paid receipt changed'; END IF;

  -- Deselect then reselect a lodging: identical and changed commission both require manual reopening.
  cancelled_accommodations := jsonb_set(accommodations, '{0,id}', to_jsonb(cancelled_accommodation));
  cancelled_commissions := jsonb_set(commissions, '{0,source_key}', to_jsonb('accommodation:' || cancelled_accommodation));
  result := public.save_proposal_bundle(NULL, payload || '{"title":"Cancelled fixture"}', '[]', '[]', '[]', cancelled_accommodations, cancelled_commissions);
  cancelled_proposal := (result->>'id')::uuid;
  SELECT id INTO STRICT cancelled_tx FROM public.financial_transactions WHERE proposal_id = cancelled_proposal;
  UPDATE public.financial_transactions SET notes = 'Keep cancellation history' WHERE id = cancelled_tx;
  PERFORM public.save_proposal_bundle(cancelled_proposal, payload || '{"title":"Cancelled fixture"}', '[]', '[]', '[]',
    jsonb_set(cancelled_accommodations, '{0,is_selected}', 'false'), '[]');
  -- Another unchanged save with no desired commission remains valid.
  PERFORM public.save_proposal_bundle(cancelled_proposal, payload || '{"title":"Cancelled fixture"}', '[]', '[]', '[]',
    jsonb_set(cancelled_accommodations, '{0,is_selected}', 'false'), '[]');
  IF NOT EXISTS(SELECT 1 FROM public.financial_transactions WHERE id = cancelled_tx AND status = 'cancelled') THEN RAISE EXCEPTION 'Deselection did not preserve a cancelled receipt'; END IF;
  -- Legacy mode must not bypass the cancelled-origin guard.
  INSERT INTO public.financial_transactions(proposal_id, type, description, amount, due_date, status)
    VALUES (cancelled_proposal, 'receivable', 'Comissão hospedagem: legacy companion', 1, '2026-09-11', 'pending');
  FOREACH retry_amount IN ARRAY ARRAY[0.01::numeric, 0.02::numeric] LOOP
    rejected := false;
    BEGIN
      PERFORM public.save_proposal_bundle(cancelled_proposal, payload || '{"title":"Reselection must roll back"}', '[]', '[]', '[]',
        cancelled_accommodations, jsonb_set(cancelled_commissions, '{0,amount}', to_jsonb(retry_amount)));
    EXCEPTION WHEN SQLSTATE '55000' THEN rejected := true;
    END;
    IF NOT rejected THEN RAISE EXCEPTION 'Reselection of cancelled origin was silently accepted (amount %)', retry_amount; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.financial_transactions WHERE id = cancelled_tx AND status = 'cancelled' AND amount = 0.01 AND notes = 'Keep cancellation history') THEN RAISE EXCEPTION 'Cancelled history was modified'; END IF;
    IF (SELECT title FROM public.proposals WHERE id = cancelled_proposal) IS DISTINCT FROM 'Cancelled fixture'
      OR (SELECT is_selected FROM public.proposal_accommodations WHERE id = cancelled_accommodation) IS NOT FALSE THEN RAISE EXCEPTION 'Reselection error did not roll back proposal/accommodation'; END IF;
  END LOOP;

  -- All these checks also run when legacy receipts exist; none may be silently ignored.
  FOR invalid_commissions IN SELECT value FROM jsonb_array_elements(jsonb_build_array(
    commissions || commissions,
    jsonb_set(commissions, '{0,amount}', 'null'),
    jsonb_build_array((commissions->0) - 'amount'),
    jsonb_set(commissions, '{0,amount}', '"0.01"'),
    jsonb_set(commissions, '{0,source_key}', 'null'),
    jsonb_build_array((commissions->0) - 'source_key'),
    jsonb_set(commissions, '{0,source_key}', '"accommodation:"'),
    jsonb_set(commissions, '{0,source_key}', to_jsonb('accommodation:' || gen_random_uuid()))
  )) LOOP
    rejected := false;
    BEGIN
      PERFORM public.save_proposal_bundle(proposal, payload || '{"title":"Invalid commissions must not save"}', items, '[]', days, accommodations, invalid_commissions);
    EXCEPTION WHEN invalid_parameter_value THEN rejected := true;
    END;
    IF NOT rejected THEN RAISE EXCEPTION 'Malformed/duplicate commission accepted'; END IF;
    IF (SELECT title FROM public.proposals WHERE id = proposal) IS DISTINCT FROM 'Atomic fixture' THEN RAISE EXCEPTION 'Invalid commission mutated proposal'; END IF;
  END LOOP;

  rejected := false;
  BEGIN
    PERFORM public.save_proposal_bundle(proposal, payload || '{"show_price_breakdown":null}', items, '[]', days, accommodations, commissions);
  EXCEPTION WHEN invalid_parameter_value THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Null detail toggle accepted'; END IF;

  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'show_price_breakdown') THEN
    result := public.save_proposal_bundle(NULL, payload || '{"show_price_breakdown":true}', '[]', '[]', '[]', '[]', '[]');
    other_proposal := (result->>'id')::uuid;
    IF NOT EXISTS(SELECT 1 FROM public.proposals p WHERE p.id = other_proposal AND (to_jsonb(p)->>'show_price_breakdown')::boolean IS TRUE) THEN RAISE EXCEPTION 'CREATE did not save explicit true'; END IF;
    PERFORM public.save_proposal_bundle(other_proposal, payload || '{"show_price_breakdown":false}', '[]', '[]', '[]', '[]', '[]');
    PERFORM public.save_proposal_bundle(other_proposal, payload, '[]', '[]', '[]', '[]', '[]');
    IF NOT EXISTS(SELECT 1 FROM public.proposals p WHERE p.id = other_proposal AND (to_jsonb(p)->>'show_price_breakdown')::boolean IS FALSE) THEN RAISE EXCEPTION 'UPDATE false or omitted toggle not preserved'; END IF;
    result := public.save_proposal_bundle(NULL, payload || '{"show_price_breakdown":false}', '[]', '[]', '[]', '[]', '[]');
    IF NOT EXISTS(SELECT 1 FROM public.proposals p WHERE p.id = (result->>'id')::uuid AND (to_jsonb(p)->>'show_price_breakdown')::boolean IS FALSE) THEN RAISE EXCEPTION 'CREATE did not save explicit false'; END IF;
    PERFORM public.save_proposal_bundle(other_proposal, payload || '{"show_price_breakdown":true}', '[]', '[]', '[]', '[]', '[]');
    IF NOT EXISTS(SELECT 1 FROM public.proposals p WHERE p.id = other_proposal AND (to_jsonb(p)->>'show_price_breakdown')::boolean IS TRUE) THEN RAISE EXCEPTION 'UPDATE true not saved'; END IF;
  ELSE
    rejected := false;
    BEGIN
      PERFORM public.save_proposal_bundle(proposal, payload || '{"show_price_breakdown":true,"title":"Missing column must roll back"}', items, '[]', days, accommodations, commissions);
    EXCEPTION WHEN undefined_column THEN rejected := true;
    END;
    IF NOT rejected THEN RAISE EXCEPTION 'Missing detail column was silently ignored'; END IF;
    IF (SELECT title FROM public.proposals WHERE id = proposal) IS DISTINCT FROM 'Atomic fixture' THEN RAISE EXCEPTION 'Missing column error did not roll back'; END IF;
  END IF;

  UPDATE bundle_test_context SET proposal_id = proposal;
  RAISE NOTICE 'PASS authenticated admin: zero cost, snapshot, paid/cancelled receipts, rollback, child IDs, commission validation and price breakdown';
END;
$$;

-- Same PostgreSQL application role, different authenticated user with no admin role.
SELECT set_config('request.jwt.claim.sub', (SELECT non_admin_id::text FROM bundle_test_context), true);
SELECT set_config('request.jwt.claims', (SELECT jsonb_build_object('sub', non_admin_id, 'role', 'authenticated')::text FROM bundle_test_context), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  rejected boolean := false;
  proposal uuid := (SELECT proposal_id FROM bundle_test_context);
BEGIN
  IF current_user IS DISTINCT FROM 'authenticated' THEN RAISE EXCEPTION 'Non-admin RPC must run as authenticated'; END IF;
  IF public.has_role(auth.uid(), 'admin') IS DISTINCT FROM false THEN RAISE EXCEPTION 'Non-admin fixture unexpectedly has admin role'; END IF;
  -- Real RLS: financial rows created by the admin must not be visible to this user.
  IF EXISTS(SELECT 1 FROM public.financial_transactions WHERE proposal_id = proposal) THEN RAISE EXCEPTION 'Non-admin bypassed financial RLS'; END IF;
  BEGIN
    PERFORM public.save_proposal_bundle(proposal, '{}', '[]', '[]', '[]', '[]', '[]');
  EXCEPTION WHEN insufficient_privilege THEN rejected := true;
  END;
  IF rejected IS DISTINCT FROM true THEN RAISE EXCEPTION 'Authenticated non-admin save permitted'; END IF;
  RAISE NOTICE 'PASS authenticated non-admin: RLS and RPC guard';
END;
$$;

-- ACL must deny anon independently of has_role: even admin-like local claims cannot grant EXECUTE.
SELECT set_config('request.jwt.claim.sub', (SELECT admin_id::text FROM bundle_test_context), true);
SELECT set_config('request.jwt.claims', (SELECT jsonb_build_object('sub', admin_id, 'role', 'anon')::text FROM bundle_test_context), true);
SET LOCAL ROLE anon;
DO $$
DECLARE
  rejected boolean := false;
BEGIN
  IF current_user IS DISTINCT FROM 'anon' THEN RAISE EXCEPTION 'Anon ACL test must run as anon'; END IF;
  IF has_function_privilege(current_user, 'public.save_proposal_bundle(uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)', 'EXECUTE') IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Anon has EXECUTE privilege';
  END IF;
  BEGIN
    PERFORM public.save_proposal_bundle(NULL, '{}', '[]', '[]', '[]', '[]', '[]');
  EXCEPTION WHEN insufficient_privilege THEN rejected := true;
  END;
  IF rejected IS DISTINCT FROM true THEN RAISE EXCEPTION 'Anon RPC call was not denied'; END IF;
  RAISE NOTICE 'PASS anon: EXECUTE ACL denies actual invocation';
END;
$$;
RESET ROLE;
ROLLBACK;
