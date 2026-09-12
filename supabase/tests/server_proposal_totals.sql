-- LOCAL disposable database only. Real RPC, authenticated admin, then public read.
BEGIN;
CREATE TEMP TABLE pricing_context(admin_id uuid, proposal_id uuid);
INSERT INTO pricing_context VALUES(gen_random_uuid(),null);
INSERT INTO auth.users(id,email) SELECT admin_id,admin_id::text||'@example.invalid' FROM pricing_context;
INSERT INTO public.user_roles(user_id,role) SELECT admin_id,'admin' FROM pricing_context;
GRANT SELECT,UPDATE ON pricing_context TO authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT admin_id::text FROM pricing_context),true);
SELECT set_config('request.jwt.claims',(SELECT jsonb_build_object('sub',admin_id,'role','authenticated')::text FROM pricing_context),true);
SET LOCAL ROLE authenticated;
DO $$ DECLARE result jsonb; payload jsonb; items jsonb; rejected boolean; BEGIN
  payload := '{"title":"LOCAL pricing","status":"draft","segment":"b2b","subtotal":1,"total":2,"num_people":20,"num_days":7,"language":"pt","atmos_service":{"price_per_person_day":300,"num_courtesies":2}}';
  items := '[{"day_number":1,"day_label":"Day 1","category":"Experiências","item_name":"LOCAL itinerary","item_index":0,"quantity":20,"value":2550,"cost_price":1000,"commission_percent":0}]';
  result := public.save_proposal_bundle(null,payload,items,'[]','[]','[]','[]');
  UPDATE pricing_context SET proposal_id=(result->>'id')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.proposals WHERE id=(SELECT proposal_id FROM pricing_context)
    AND subtotal=51000 AND total=93000) THEN RAISE EXCEPTION 'Browser supplied totals were trusted'; END IF;
  items := jsonb_set(items,'{0,id}',result#>'{child_ids,items,0}');
  result := public.save_proposal_bundle((SELECT proposal_id FROM pricing_context),payload||'{"tax_percent":6,"discount_percent":10}',items,'[]','[]','[]','[]');
  IF (SELECT total FROM public.proposals WHERE id=(SELECT proposal_id FROM pricing_context)) IS DISTINCT FROM 93510.64 THEN
    RAISE EXCEPTION 'Discount/tax calculation differs from the pricing rule';
  END IF;
  rejected := false;
  BEGIN
    PERFORM public.save_proposal_bundle((SELECT proposal_id FROM pricing_context),payload||'{"title":"Must rollback","tax_percent":100}',items,'[]','[]','[]','[]');
  EXCEPTION WHEN SQLSTATE '22023' THEN rejected:=true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Invalid tax was accepted'; END IF;
  IF (SELECT title FROM public.proposals WHERE id=(SELECT proposal_id FROM pricing_context)) IS DISTINCT FROM 'LOCAL pricing' THEN
    RAISE EXCEPTION 'Invalid pricing did not roll back';
  END IF;
  result := public.proposal_pricing_from_bundle('{"num_people":1,"num_days":1,"discount_percent":10,"tax_percent":6,"atmos_service":{"price_per_person_day":20}}',
    '[{"value":100.05,"quantity":1}]','[{"is_selected":true,"payment_type":"atmos","num_nights":1,"rooms":[{"rooms":[{"price":30,"units":1,"capacity":1,"available":true}]}]}]');
  IF (result->>'total')::numeric IS DISTINCT FROM 148.98 THEN RAISE EXCEPTION 'Cent rounding differs from frontend'; END IF;
  -- Same lodging amount paid directly to supplier must not enter the ATMOS invoice.
  result := public.proposal_pricing_from_bundle('{"num_people":3,"num_days":1,"atmos_service":{"price_per_person_day":0.145}}','[]','[]');
  IF (result->>'total')::numeric IS DISTINCT FROM 0.44 THEN RAISE EXCEPTION 'Subcent service operands rounded before multiplication'; END IF;
  result := public.proposal_pricing_from_bundle('{"num_people":3,"num_days":1}', '[]',
    '[{"is_selected":true,"payment_type":"atmos","num_nights":1,"rooms":[{"rooms":[{"price":0.145,"units":3,"capacity":1,"available":true}]}]}]');
  IF (result->>'total')::numeric IS DISTINCT FROM 0.44 THEN RAISE EXCEPTION 'Subcent lodging differs from frontend'; END IF;
  result := public.proposal_pricing_from_bundle('{"num_people":1,"num_days":1}',
    '[{"value":100,"quantity":1}]','[{"is_selected":true,"payment_type":"hospedagem","num_nights":1,"rooms":[{"rooms":[{"price":30,"units":1,"capacity":1,"available":true}]}]}]');
  IF (result->>'total')::numeric IS DISTINCT FROM 100 THEN RAISE EXCEPTION 'Supplier-paid lodging entered invoice'; END IF;
  UPDATE public.proposals SET published_at=now(),slug='local-pricing-fixture' WHERE id=(SELECT proposal_id FROM pricing_context);
END $$;
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',true);
SELECT set_config('request.jwt.claims','{}',true);
SET LOCAL ROLE anon;
DO $$ DECLARE result jsonb; BEGIN
  result:=public.get_public_proposal('local-pricing-fixture');
  IF (result->>'total')::numeric IS DISTINCT FROM 93510.64 THEN RAISE EXCEPTION 'Public total differs from saved total'; END IF;
  IF (result->>'net_per_person')::numeric IS DISTINCT FROM 93510.64/18 THEN RAISE EXCEPTION 'Public rateio did not use 18 paying travelers'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
