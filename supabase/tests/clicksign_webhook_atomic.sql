-- LOCAL disposable database only; fixtures and fault injection roll back.
BEGIN;
CREATE FUNCTION pg_temp.suppress_clicksign_update() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.title = 'Clicksign zero row test' AND NEW.contract_status = 'signed' THEN RETURN NULL; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER clicksign_test_suppress BEFORE UPDATE ON public.proposals
FOR EACH ROW EXECUTE FUNCTION pg_temp.suppress_clicksign_update();
DO $$
DECLARE
  lead_id uuid := gen_random_uuid(); p_id uuid := gen_random_uuid(); other_id uuid := gen_random_uuid();
  target_stage_id uuid := gen_random_uuid(); wrong_stage uuid := gen_random_uuid();
  outbox uuid; token_a uuid := gen_random_uuid(); token_b uuid := gen_random_uuid(); r jsonb;
BEGIN
  ASSERT NOT has_function_privilege('anon', 'public.complete_clicksign_document(text,text)', 'EXECUTE');
  ASSERT NOT has_function_privilege('authenticated', 'public.complete_clicksign_document(text,text)', 'EXECUTE');
  ASSERT NOT has_function_privilege('authenticated', 'public.transition_clicksign_notification(uuid,uuid,text)', 'EXECUTE');
  ASSERT NOT has_table_privilege('authenticated', 'public.clicksign_notification_outbox', 'SELECT');
  ASSERT has_function_privilege('service_role', 'public.complete_clicksign_document(text,text)', 'EXECUTE');
  INSERT INTO public.pipeline_stages(id,name,segment,position) VALUES
    (target_stage_id, 'Contrato Assinado test', 'b2c', -10000), (wrong_stage, 'Contrato Assinado test', 'b2b', -10001);
  INSERT INTO public.prospects(id,name,segment,phone,notes) VALUES (lead_id,'Clicksign test','b2c','000000000','preserve me');
  INSERT INTO public.proposals(id,title,prospect_id,segment,contract_status,clicksign_document_key,clicksign_request_signature_key)
    VALUES(p_id,'Clicksign test',lead_id,'b2c','sent','test-document','test-request');
  INSERT INTO public.proposals(id,title,segment,contract_status,clicksign_document_key,clicksign_request_signature_key,contract_url)
    VALUES(other_id,'Clicksign unrelated','b2b','sent','other-document','other-request','clicksign:legacy-request');
  ASSERT public.complete_clicksign_document('other-document','test-request')->>'action' = 'identity_mismatch';
  ASSERT public.complete_clicksign_document('unknown-document','test-request')->>'action' = 'identity_not_found';
  ASSERT public.complete_clicksign_document('unknown-document','legacy-request')->>'action' = 'identity_not_found';
  ASSERT (SELECT contract_status = 'sent' FROM public.proposals WHERE id = p_id);
  ASSERT NOT EXISTS (SELECT FROM public.clicksign_notification_outbox WHERE proposal_id = p_id);
  r := public.complete_clicksign_document('test-document','test-request');
  ASSERT r->>'action' = 'signed'; outbox := (r->>'outbox_id')::uuid;
  ASSERT (SELECT contract_status = 'signed' FROM public.proposals WHERE id = p_id);
  ASSERT (SELECT count(*) = 1 FROM public.prospect_interactions WHERE prospect_id = lead_id AND type = 'note');
  ASSERT (SELECT count(*) = 1 FROM public.prospect_interactions WHERE prospect_id = lead_id AND type = 'stage_change');
  ASSERT (SELECT prospects.stage_id = target_stage_id AND notes = 'preserve me' FROM public.prospects WHERE id = lead_id);
  ASSERT public.complete_clicksign_document('test-document',NULL)->>'action' = 'already_signed';
  ASSERT (SELECT count(*) = 2 FROM public.prospect_interactions WHERE prospect_id = lead_id);
  ASSERT (SELECT count(*) = 1 FROM public.clicksign_notification_outbox WHERE proposal_id = p_id);
  ASSERT public.transition_clicksign_notification(outbox,token_a,'claim')->>'claimed' = 'true';
  ASSERT public.transition_clicksign_notification(outbox,token_b,'claim')->>'claimed' = 'false';
  -- Expired pre-send claims are recoverable, but the old process loses ownership.
  UPDATE public.clicksign_notification_outbox SET lease_until = now() - interval '1 minute' WHERE id = outbox;
  ASSERT public.transition_clicksign_notification(outbox,token_b,'claim')->>'claimed' = 'true';
  BEGIN
    PERFORM public.transition_clicksign_notification(outbox,token_a,'sending');
    RAISE EXCEPTION 'Expected stale claim failure';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Stale notification claim' THEN RAISE; END IF;
  END;
  PERFORM public.transition_clicksign_notification(outbox,token_b,'sending');
  UPDATE public.clicksign_notification_outbox SET lease_until = now() - interval '1 day' WHERE id = outbox;
  ASSERT public.transition_clicksign_notification(outbox,token_a,'claim')->>'claimed' = 'false';
  PERFORM public.transition_clicksign_notification(outbox,token_b,'sent');
  ASSERT public.transition_clicksign_notification(outbox,token_a,'claim')->>'state' = 'sent';
  UPDATE public.proposals SET contract_status = 'sent' WHERE id = p_id;
  ASSERT public.complete_clicksign_document('test-document','test-request')->>'action' = 'state_conflict';
  ASSERT public.complete_clicksign_document('other-document',NULL)->>'action' = 'signed';
  ASSERT (SELECT state = 'skipped' FROM public.clicksign_notification_outbox WHERE proposal_id = other_id);
END;
$$;
-- Inject an interaction error AFTER the signed update; transaction must roll back all effects.
ALTER TABLE public.prospect_interactions ADD CONSTRAINT clicksign_injected_failure
  CHECK (content NOT LIKE '%Contrato assinado digitalmente%') NOT VALID;
DO $$
DECLARE l uuid := gen_random_uuid(); p uuid := gen_random_uuid();
BEGIN
  INSERT INTO public.prospects(id,name,segment) VALUES(l,'Rollback test','b2c');
  INSERT INTO public.proposals(id,title,prospect_id,contract_status,clicksign_document_key)
    VALUES(p,'Rollback test',l,'sent','rollback-document');
  BEGIN
    PERFORM public.complete_clicksign_document('rollback-document');
    RAISE EXCEPTION 'Expected injected DB error';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  ASSERT (SELECT contract_status = 'sent' FROM public.proposals WHERE id = p);
  ASSERT NOT EXISTS (SELECT FROM public.prospect_interactions WHERE prospect_id = l);
  ASSERT NOT EXISTS (SELECT FROM public.clicksign_notification_outbox WHERE proposal_id = p);
  UPDATE public.proposals SET title = 'Clicksign zero row test' WHERE id = p;
  BEGIN
    PERFORM public.complete_clicksign_document('rollback-document');
    RAISE EXCEPTION 'Expected zero row error';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Proposal update affected no row' THEN RAISE; END IF;
  END;
  ASSERT (SELECT contract_status = 'sent' FROM public.proposals WHERE id = p);
END;
$$;
ROLLBACK;
