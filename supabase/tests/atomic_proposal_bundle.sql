-- Run only against a disposable LOCAL database with migrations applied.
-- psql -v ON_ERROR_STOP=1 -f supabase/tests/atomic_proposal_bundle.sql
BEGIN;
DO $$
DECLARE
  actor uuid := gen_random_uuid();
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
BEGIN
  INSERT INTO auth.users(id, email) VALUES (actor, actor::text || '@example.invalid');
  INSERT INTO public.user_roles(user_id, role) VALUES (actor, 'admin');
  PERFORM set_config('request.jwt.claim.sub', actor::text, true);
  PERFORM set_config('request.jwt.claims', jsonb_build_object('sub', actor, 'role', 'authenticated')::text, true);
  INSERT INTO public.products(id, name, type, variables, cost_price) VALUES (product, 'Fixture accommodation', 'accommodation', '{"comissao":10}', 100);
  items := jsonb_set(items, '{0,catalog_item_id}', to_jsonb(product));
  accommodations := jsonb_build_array(jsonb_build_object('id', accommodation, 'product_id', product,
    'num_nights', 1, 'notes', '', 'is_selected', true, 'payment_type', 'hospedagem', 'rooms',
    '[{"unit_label":"Fixture","rooms":[{"type":"single","available":true,"units":1,"capacity":1,"pricing_type":"per_room","cost":0.05,"price":0.05,"commission_percent":10},{"type":"single","available":true,"units":1,"capacity":1,"pricing_type":"per_room","cost":0.05,"price":0.05,"commission_percent":10}]}]'::jsonb));
  commissions := jsonb_build_array(jsonb_build_object('source_key', 'accommodation:' || accommodation,
    'description', 'Comissão hospedagem: fixture', 'amount', 0.01, 'due_date', '2026-09-11'));
  result := public.save_proposal_bundle(NULL, payload, items, '[]', days, accommodations, commissions);
  proposal := (result->>'id')::uuid;
  IF (SELECT cost_price FROM public.proposal_day_items WHERE proposal_id = proposal) <> 0 THEN RAISE EXCEPTION 'Zero cost not preserved'; END IF;
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
  IF (SELECT amount FROM public.financial_transactions WHERE id = tx) <> 0.01 THEN RAISE EXCEPTION 'Commission total mismatch'; END IF;

  UPDATE public.products SET variables = '{"comissao":20}', cost_price = 999 WHERE id = product;
  PERFORM public.save_proposal_bundle(proposal, payload, items, '[]', days, accommodations, commissions);
  IF (SELECT rooms#>>'{0,rooms,0,commission_percent}' FROM public.proposal_accommodations WHERE id = accommodation) <> '10' THEN RAISE EXCEPTION 'Historical snapshot changed'; END IF;
  IF (SELECT cost_price FROM public.proposal_day_items WHERE proposal_id = proposal) <> 0 THEN RAISE EXCEPTION 'Catalog overwrote zero cost'; END IF;
  IF (SELECT count(*) FROM public.financial_transactions WHERE proposal_id = proposal) <> 1 THEN RAISE EXCEPTION 'Retry duplicated commission'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.proposal_day_items WHERE id = item_id AND start_time = '08:30' AND end_time = '10:00') THEN RAISE EXCEPTION 'Item identity/time lost'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.proposal_days WHERE id = day_id AND observation = 'Public observation retained') THEN RAISE EXCEPTION 'Day identity/observation lost'; END IF;
  IF (SELECT contract_url FROM public.proposals WHERE id = proposal) <> 'https://example.invalid/contract' THEN RAISE EXCEPTION 'Unedited proposal field lost'; END IF;
  IF EXISTS(SELECT 1 FROM public.proposals p WHERE p.id = proposal AND to_jsonb(p) ? 'show_price_breakdown' AND (to_jsonb(p)->>'show_price_breakdown')::boolean IS NOT TRUE) THEN RAISE EXCEPTION 'Public detail toggle overwritten'; END IF;


  accommodations := jsonb_set(accommodations, '{0,rooms,0,rooms,0,commission_percent}', '0');
  PERFORM public.save_proposal_bundle(proposal, payload, items, '[]', days, accommodations, commissions);
  IF (SELECT rooms#>>'{0,rooms,0,commission_percent}' FROM public.proposal_accommodations WHERE id = accommodation) <> '0' THEN RAISE EXCEPTION 'Zero commission snapshot lost'; END IF;

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
  IF (SELECT title FROM public.proposals WHERE id = proposal) <> 'Atomic fixture' THEN RAISE EXCEPTION 'Paid-change rejection did not roll back proposal'; END IF;

  rejected := false;
  BEGIN
    PERFORM public.save_proposal_bundle(proposal, payload || '{"title":"Must rollback items"}',
      jsonb_set(items, '{0,category}', 'null'), '[]', days, accommodations, commissions);
  EXCEPTION WHEN not_null_violation THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Invalid child did not fail'; END IF;
  IF (SELECT title FROM public.proposals WHERE id = proposal) <> 'Atomic fixture' OR
     (SELECT count(*) FROM public.proposal_day_items WHERE proposal_id = proposal) <> 1 THEN RAISE EXCEPTION 'Partial save survived failure'; END IF;

  INSERT INTO public.financial_transactions(proposal_id, type, description, amount, due_date, status, paid_date)
    VALUES (proposal, 'receivable', 'Comissão hospedagem: legacy', 123, '2026-09-11', 'paid', '2026-09-10');
  result := public.save_proposal_bundle(proposal, payload, items, '[]', days, accommodations, commissions);
  IF NOT (result->>'legacy_commissions')::boolean THEN RAISE EXCEPTION 'Legacy warning missing'; END IF;
  IF (SELECT count(*) FROM public.financial_transactions WHERE proposal_id = proposal) <> 2 OR
     NOT EXISTS(SELECT 1 FROM public.financial_transactions WHERE proposal_id = proposal AND source_key IS NULL AND status = 'paid' AND amount = 123) THEN RAISE EXCEPTION 'Legacy paid receipt changed'; END IF;

  PERFORM set_config('request.jwt.claim.sub', gen_random_uuid()::text, true);
  rejected := false;
  BEGIN
    PERFORM public.save_proposal_bundle(proposal, payload, items, '[]', days, accommodations, commissions);
  EXCEPTION WHEN insufficient_privilege THEN rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Non-admin save permitted'; END IF;
  RAISE NOTICE 'PASS: zero cost, commission snapshot, paid receipt, idempotence, legacy preservation, rollback, admin guard';
END;
$$;
ROLLBACK;
