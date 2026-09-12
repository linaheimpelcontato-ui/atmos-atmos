-- SQL NOT EXECUTED. Disposable PostgreSQL only, after all migrations. No production.
BEGIN;
CREATE TEMP TABLE cost_identity_context(admin_id uuid,other_id uuid) ON COMMIT DROP;
INSERT INTO cost_identity_context VALUES(gen_random_uuid(),gen_random_uuid());
INSERT INTO auth.users(id) SELECT admin_id FROM cost_identity_context UNION ALL SELECT other_id FROM cost_identity_context;
INSERT INTO public.user_roles(user_id,role) SELECT admin_id,'admin' FROM cost_identity_context;
GRANT SELECT ON cost_identity_context TO authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT admin_id::text FROM cost_identity_context),true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
 p uuid; a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); chk uuid; snapshot jsonb; changed jsonb; patch jsonb;
 items jsonb; r jsonb; rejected boolean; saved public.proposal_day_items; checks_payload jsonb;
BEGIN
 r:=public.save_proposal_bundle(NULL,'{"title":"Identity fixture","status":"draft","segment":"b2c","subtotal":0,"discount_percent":0,"discount_fixed":0,"tax_percent":0,"total":0}',
 jsonb_build_array(jsonb_build_object('id',a,'day_number',1,'item_index',0,'category','Serviços','item_name','A','quantity',1,'cost_price',20),
 jsonb_build_object('id',b,'day_number',1,'item_index',1,'category','Serviços','item_name','B','quantity',1,'cost_price',40)), '[]','[]','[]','[]');
 p:=(r->>'id')::uuid;
 SELECT * INTO saved FROM public.proposal_day_items WHERE id=a;
 snapshot:=public.cost_item_identity(saved);
 checks_payload:=jsonb_build_array(jsonb_build_object('item_id',a,'expected_snapshot',snapshot,'actual_cost',0,'is_verified',true,'notes','zero original'));
 IF public.save_proposal_cost_checks(p,checks_payload,'[]') IS DISTINCT FROM true THEN RAISE EXCEPTION 'check save failed'; END IF;
 SELECT id INTO chk FROM public.proposal_cost_checks WHERE proposal_id=p AND item_id=a;
 IF chk IS NULL OR (SELECT actual_cost FROM public.proposal_cost_checks WHERE id=chk) IS DISTINCT FROM 0 THEN RAISE EXCEPTION 'zero missing'; END IF;
 SELECT jsonb_agg(to_jsonb(i) ORDER BY item_index) INTO items FROM public.proposal_day_items i WHERE proposal_id=p;
 -- Each failed mutation must roll back title/items and preserve check zero, identity and notes.
 FOR patch IN SELECT value FROM jsonb_array_elements(jsonb_build_array(
   jsonb_build_object('id',gen_random_uuid()), '{"day_number":2}'::jsonb, '{"item_index":2}'::jsonb,
   jsonb_build_object('catalog_item_id',gen_random_uuid()),jsonb_build_object('variation_id',gen_random_uuid()),
   jsonb_build_object('supplier_id',gen_random_uuid()),'{"category":"Other"}'::jsonb,'{"vehicle_type":"4x4"}'::jsonb)) LOOP
   changed:=jsonb_set(items,'{0}',items->0 || patch);
   rejected:=false;
   BEGIN PERFORM public.save_proposal_bundle(p,'{"title":"MUST ROLLBACK"}',changed,'[]','[]','[]','[]');
   EXCEPTION WHEN SQLSTATE '55000' THEN rejected:=true; END;
   IF rejected IS DISTINCT FROM true THEN RAISE EXCEPTION 'identity mutation passed: %',patch; END IF;
   IF (SELECT title FROM public.proposals WHERE id=p) IS DISTINCT FROM 'Identity fixture' OR
      (SELECT actual_cost FROM public.proposal_cost_checks WHERE id=chk) IS DISTINCT FROM 0 OR
      (SELECT notes FROM public.proposal_cost_checks WHERE id=chk) IS DISTINCT FROM 'zero original' THEN RAISE EXCEPTION 'rollback/history failed'; END IF;
 END LOOP;
 -- Remove A, swap A/B, and collide B into A's slot.
 FOR changed IN SELECT value FROM jsonb_array_elements(jsonb_build_array(
   jsonb_build_array(items->1),
   jsonb_build_array(items->0 || '{"item_index":1}',items->1 || '{"item_index":0}'),
   jsonb_build_array(items->0,items->1 || '{"item_index":0}'))) LOOP
   rejected:=false;
   BEGIN PERFORM public.save_proposal_bundle(p,'{}',changed,'[]','[]','[]','[]');
   EXCEPTION WHEN SQLSTATE '55000' OR SQLSTATE '22023' THEN rejected:=true; END;
   IF rejected IS DISTINCT FROM true THEN RAISE EXCEPTION 'structural mutation passed'; END IF;
 END LOOP;
 -- Text and normal quantity edits are legitimate bundle edits, but stale checklist writes fail.
 changed:=jsonb_set(items,'{0}',items->0 || '{"description":"New text","day_label":"New label","quantity":2}');
 PERFORM public.save_proposal_bundle(p,'{}',changed,'[]','[]','[]','[]');
 rejected:=false;
 BEGIN PERFORM public.save_proposal_cost_checks(p,checks_payload,'[]'); EXCEPTION WHEN SQLSTATE '55000' THEN rejected:=true; END;
 IF rejected IS DISTINCT FROM true THEN RAISE EXCEPTION 'stale quantity snapshot accepted'; END IF;
 -- Direct authenticated admin writes cannot bypass the parent lock/identity protocol.
 rejected:=false;
 BEGIN UPDATE public.proposal_cost_checks SET is_verified=false WHERE id=chk; EXCEPTION WHEN insufficient_privilege THEN rejected:=true; END;
 IF rejected IS DISTINCT FROM true THEN RAISE EXCEPTION 'direct update bypass'; END IF;
 -- Explicit release archives complete old row; reordering then cannot reuse a stale expected snapshot.
 PERFORM public.save_proposal_cost_checks(p,'[]',jsonb_build_array(chk));
 IF NOT EXISTS(SELECT 1 FROM public.proposal_cost_check_history WHERE check_id=chk AND previous_record->>'notes'='zero original' AND (previous_record->>'actual_cost')::numeric=0 AND (previous_record->>'is_verified')::boolean) THEN RAISE EXCEPTION 'history lost'; END IF;
 rejected:=false;
 BEGIN PERFORM public.save_proposal_bundle(p,'{}',jsonb_build_array(changed->0,changed->1 || '{"item_index":0}'),'[]','[]','[]','[]'); EXCEPTION WHEN SQLSTATE '22023' THEN rejected:=true; END;
 IF rejected IS DISTINCT FROM true THEN RAISE EXCEPTION 'unverified final slot collision accepted'; END IF;
 changed:=jsonb_build_array(changed->0 || '{"item_index":1}',changed->1 || '{"item_index":0}');
 PERFORM public.save_proposal_bundle(p,'{}',changed,'[]','[]','[]','[]');
 rejected:=false;
 BEGIN PERFORM public.save_proposal_cost_checks(p,checks_payload,'[]'); EXCEPTION WHEN SQLSTATE '55000' THEN rejected:=true; END;
 IF rejected IS DISTINCT FROM true THEN RAISE EXCEPTION 'stale reorder snapshot accepted'; END IF;
 SELECT * INTO saved FROM public.proposal_day_items WHERE id=b;
 PERFORM public.save_proposal_cost_checks(p,jsonb_build_array(jsonb_build_object('item_id',b,'expected_snapshot',public.cost_item_identity(saved),'actual_cost',45,'is_verified',true,'notes','B newly reviewed')),'[]');
 IF (SELECT item_id FROM public.proposal_cost_checks WHERE id=chk) IS DISTINCT FROM b OR
    NOT EXISTS(SELECT 1 FROM public.proposal_cost_check_history WHERE check_id=chk AND previous_record->>'item_id'=a::text AND previous_record->>'notes'='zero original') THEN RAISE EXCEPTION 'explicit rebinding history missing'; END IF;
 -- Foreign proposal item must not be accepted.
 rejected:=false;
 BEGIN PERFORM public.save_proposal_cost_checks(gen_random_uuid(),checks_payload,'[]'); EXCEPTION WHEN raise_exception THEN rejected:=true; END;
 IF rejected IS DISTINCT FROM true THEN RAISE EXCEPTION 'foreign proposal accepted'; END IF;
END $$;
RESET ROLE;
-- Provision a truly unbound legacy check with privileged connection (never automatic backfill).
DO $$ DECLARE p uuid:=gen_random_uuid(); a uuid:=gen_random_uuid(); BEGIN
 INSERT INTO public.proposals(id,title) VALUES(p,'Legacy binding fixture');
 INSERT INTO public.proposal_day_items(id,proposal_id,day_number,item_index,category) VALUES(a,p,1,0,'Legacy');
 INSERT INTO public.proposal_cost_checks(proposal_id,day_number,item_index,actual_cost,is_verified,notes) VALUES(p,1,0,777,true,'Do not infer association');
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE p uuid; i public.proposal_day_items; c public.proposal_cost_checks; payload jsonb; rejected boolean:=false; BEGIN
 SELECT id INTO STRICT p FROM public.proposals WHERE title='Legacy binding fixture';
 SELECT * INTO STRICT i FROM public.proposal_day_items WHERE proposal_id=p;
 SELECT * INTO STRICT c FROM public.proposal_cost_checks WHERE proposal_id=p;
 IF c.item_id IS NOT NULL OR c.identity_snapshot IS NOT NULL THEN RAISE EXCEPTION 'legacy auto-associated'; END IF;
 payload:=jsonb_build_array(jsonb_build_object('item_id',i.id,'expected_snapshot',public.cost_item_identity(i),'actual_cost',0,'is_verified',true,'notes','Manually reviewed zero'));
 BEGIN PERFORM public.save_proposal_cost_checks(p,payload,'[]'); EXCEPTION WHEN SQLSTATE '55000' THEN rejected:=true; END;
 IF rejected IS DISTINCT FROM true THEN RAISE EXCEPTION 'legacy silently rebound'; END IF;
 PERFORM public.save_proposal_cost_checks(p,'[]',jsonb_build_array(c.id));
 PERFORM public.save_proposal_cost_checks(p,payload,'[]');
 IF (SELECT actual_cost FROM public.proposal_cost_checks WHERE id=c.id) IS DISTINCT FROM 0 OR NOT EXISTS(SELECT 1 FROM public.proposal_cost_check_history WHERE check_id=c.id AND previous_record->>'notes'='Do not infer association' AND previous_record->'item_id'='null'::jsonb) THEN RAISE EXCEPTION 'legacy/zero history lost'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub',(SELECT other_id::text FROM cost_identity_context),true);
DO $$ BEGIN
 BEGIN PERFORM public.save_proposal_cost_checks(gen_random_uuid(),'[]','[]'); RAISE EXCEPTION 'nonadmin accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 IF EXISTS(SELECT 1 FROM public.proposal_cost_check_history) THEN RAISE EXCEPTION 'history exposed'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
 BEGIN PERFORM public.save_proposal_cost_checks(gen_random_uuid(),'[]','[]'); RAISE EXCEPTION 'anon ACL failed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;
