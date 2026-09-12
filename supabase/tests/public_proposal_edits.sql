-- Isolated DB only: psql -v ON_ERROR_STOP=1 -f supabase/tests/public_proposal_edits.sql
-- NOT EXECUTED: local PostgreSQL unavailable.
BEGIN;
INSERT INTO auth.users(id,email) VALUES ('00000000-0000-4000-8000-000000003001','edits-admin@example.invalid');
INSERT INTO public.user_roles(user_id,role) VALUES ('00000000-0000-4000-8000-000000003001','admin');
INSERT INTO public.proposals(id,title,segment) VALUES
 ('00000000-0000-4000-8000-000000003101','Edits fixture','b2c'),
 ('00000000-0000-4000-8000-000000003102','Other fixture','b2c');
INSERT INTO public.proposal_days(id,proposal_id,day_number,description,observation) VALUES
 ('00000000-0000-4000-8000-000000003201','00000000-0000-4000-8000-000000003101',1,'Keep description','Old observation');
INSERT INTO public.proposal_day_items(id,proposal_id,day_number,category,item_name,description,item_index) VALUES
 ('00000000-0000-4000-8000-000000003301','00000000-0000-4000-8000-000000003101',1,'Serviços','First','Old first',0),
 ('00000000-0000-4000-8000-000000003302','00000000-0000-4000-8000-000000003101',1,'Serviços','Second','Old second',1),
 ('00000000-0000-4000-8000-000000003303','00000000-0000-4000-8000-000000003102',1,'Serviços','Other','Other private',0),
 ('00000000-0000-4000-8000-000000003304','00000000-0000-4000-8000-000000003101',2,'Serviços','Other day','Different day allows same index',0);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003001',true);
DO $$ DECLARE ok boolean; rejected boolean := false; BEGIN
  ok := public.save_public_proposal_edits('00000000-0000-4000-8000-000000003101',
    '[{"day_number":1,"observation":"","day_label":"New label"}]',
    '[{"id":"00000000-0000-4000-8000-000000003301","description":"New first","item_index":1},{"id":"00000000-0000-4000-8000-000000003302","description":null,"item_index":0}]');
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'No success'; END IF;
  IF (SELECT description FROM public.proposal_days WHERE id='00000000-0000-4000-8000-000000003201') IS DISTINCT FROM 'Keep description' THEN RAISE EXCEPTION 'Day identity/description lost'; END IF;
  IF (SELECT observation FROM public.proposal_days WHERE id='00000000-0000-4000-8000-000000003201') IS DISTINCT FROM '' THEN RAISE EXCEPTION 'Observation not cleared'; END IF;
  IF (SELECT item_index FROM public.proposal_day_items WHERE id='00000000-0000-4000-8000-000000003301') IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Order not saved'; END IF;
  IF (SELECT description FROM public.proposal_day_items WHERE id='00000000-0000-4000-8000-000000003302') IS NOT NULL THEN RAISE EXCEPTION 'Description not cleared'; END IF;
  BEGIN
    PERFORM public.save_public_proposal_edits('00000000-0000-4000-8000-000000003101','[]',
      '[{"id":"00000000-0000-4000-8000-000000003301","description":"Collision","item_index":0},{"id":"00000000-0000-4000-8000-000000003302","description":"Collision","item_index":0}]');
  EXCEPTION WHEN unique_violation THEN rejected := true; END;
  IF rejected IS DISTINCT FROM true THEN RAISE EXCEPTION 'Duplicate final positions accepted'; END IF;
  rejected := false;
  BEGIN
    PERFORM public.save_public_proposal_edits('00000000-0000-4000-8000-000000003101','[]',
      '[{"id":"00000000-0000-4000-8000-000000003301","description":"Collision with omitted item","item_index":0}]');
  EXCEPTION WHEN unique_violation THEN rejected := true; END;
  IF rejected IS DISTINCT FROM true THEN RAISE EXCEPTION 'Collision with omitted item accepted'; END IF;
  IF (SELECT item_index FROM public.proposal_day_items WHERE id='00000000-0000-4000-8000-000000003301') IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Collision not rolled back'; END IF;
  rejected := false;
  INSERT INTO public.proposal_cost_checks(proposal_id,day_number,item_index,actual_cost,is_verified)
    VALUES('00000000-0000-4000-8000-000000003101',1,1,50,true);
  BEGIN
    PERFORM public.save_public_proposal_edits('00000000-0000-4000-8000-000000003101','[]',
      '[{"id":"00000000-0000-4000-8000-000000003301","description":"Keep","item_index":0}]');
  EXCEPTION WHEN raise_exception THEN rejected := true; END;
  IF rejected IS DISTINCT FROM true THEN RAISE EXCEPTION 'Verified cost allowed to change item association'; END IF;
  IF (SELECT item_index FROM public.proposal_day_items WHERE id='00000000-0000-4000-8000-000000003301') IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Verified item moved'; END IF;
  rejected := false;
  BEGIN
    PERFORM public.save_public_proposal_edits('00000000-0000-4000-8000-000000003101',
      '[{"day_number":1,"observation":"Must roll back","day_label":"Must roll back"}]',
      '[{"id":"00000000-0000-4000-8000-000000003303","description":"Must not write","item_index":0}]');
  EXCEPTION WHEN SQLSTATE 'P0002' THEN rejected := true; END;
  IF rejected IS DISTINCT FROM true THEN RAISE EXCEPTION 'Foreign item allowed'; END IF;
  IF (SELECT observation FROM public.proposal_days WHERE id='00000000-0000-4000-8000-000000003201') IS DISTINCT FROM '' THEN RAISE EXCEPTION 'Observation not rolled back'; END IF;
  IF (SELECT day_label FROM public.proposal_day_items WHERE id='00000000-0000-4000-8000-000000003301') IS DISTINCT FROM 'New label' THEN RAISE EXCEPTION 'Labels not rolled back'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000003999',true);
DO $$ DECLARE rejected boolean := false; BEGIN
  BEGIN PERFORM public.save_public_proposal_edits('00000000-0000-4000-8000-000000003101','[]','[]');
  EXCEPTION WHEN insufficient_privilege THEN rejected := true; END;
  IF rejected IS DISTINCT FROM true THEN RAISE EXCEPTION 'Non-admin allowed'; END IF;
END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF has_function_privilege('anon','public.save_public_proposal_edits(uuid,jsonb,jsonb)','EXECUTE') IS DISTINCT FROM false THEN RAISE EXCEPTION 'Anon has execute'; END IF;
END $$;
RESET ROLE;
ROLLBACK;
