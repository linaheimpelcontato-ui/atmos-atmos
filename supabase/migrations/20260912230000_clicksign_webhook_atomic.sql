BEGIN;

-- Durable notification intent. No client access; only the service webhook RPCs.
CREATE TABLE public.clicksign_notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  document_key text NOT NULL,
  phone text,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','processing','sending','sent','skipped')),
  claim_token uuid,
  lease_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, document_key)
);
ALTER TABLE public.clicksign_notification_outbox ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.clicksign_notification_outbox FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.clicksign_notification_outbox TO service_role;

-- Called only after HMAC and server-side Clicksign status verification.
CREATE FUNCTION public.complete_clicksign_document(p_document_key text, p_request_signature_key text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  p public.proposals%ROWTYPE;
  lead public.prospects%ROWTYPE;
  target public.pipeline_stages%ROWTYPE;
  old_name text;
  notification_id uuid;
BEGIN
  IF nullif(btrim(p_document_key), '') IS NULL THEN
    RETURN jsonb_build_object('action', 'invalid_identity');
  END IF;
  SELECT * INTO p FROM public.proposals WHERE clicksign_document_key = p_document_key FOR UPDATE;
  IF NOT FOUND THEN
    -- Never fall back to a request key: legacy rows need a verified document-key backfill.
    RETURN jsonb_build_object('action', 'identity_not_found');
  END IF;
  IF p_request_signature_key IS NOT NULL AND
     p.clicksign_request_signature_key IS DISTINCT FROM p_request_signature_key THEN
    RETURN jsonb_build_object('action', 'identity_mismatch');
  END IF;
  SELECT id INTO notification_id FROM public.clicksign_notification_outbox
    WHERE proposal_id = p.id AND document_key = p_document_key;
  IF p.contract_status = 'signed' THEN
    RETURN jsonb_build_object('action', 'already_signed', 'proposal_id', p.id, 'outbox_id', notification_id);
  END IF;
  -- Do not replay history even if someone manually resets contract_status later.
  IF notification_id IS NOT NULL THEN
    RETURN jsonb_build_object('action', 'state_conflict');
  END IF;
  UPDATE public.proposals SET contract_status = 'signed' WHERE id = p.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposal update affected no row'; END IF;
  IF p.prospect_id IS NOT NULL THEN
    SELECT * INTO STRICT lead FROM public.prospects WHERE id = p.prospect_id FOR UPDATE;
    INSERT INTO public.prospect_interactions(prospect_id, type, content)
      VALUES (lead.id, 'note', '✅ Contrato assinado digitalmente via Clicksign (confirmado via API)');
    SELECT * INTO target FROM public.pipeline_stages
      WHERE segment = lead.segment AND name ILIKE '%Contrato Assinado%'
      ORDER BY position, id LIMIT 1;
    IF FOUND AND lead.stage_id IS DISTINCT FROM target.id THEN
      SELECT name INTO old_name FROM public.pipeline_stages WHERE id = lead.stage_id;
      UPDATE public.prospects SET stage_id = target.id, updated_at = now() WHERE id = lead.id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Prospect update affected no row'; END IF;
      INSERT INTO public.prospect_interactions(prospect_id, type, content)
        VALUES (lead.id, 'stage_change', coalesce(old_name, '?') || ' → ' || target.name || ' (automático: contrato assinado)');
    END IF;
  END IF;
  INSERT INTO public.clicksign_notification_outbox(proposal_id, document_key, phone, state)
    VALUES (p.id, p_document_key, lead.phone, CASE WHEN nullif(lead.phone, '') IS NULL THEN 'skipped' ELSE 'pending' END)
    RETURNING id INTO notification_id;
  RETURN jsonb_build_object('action', 'signed', 'proposal_id', p.id, 'outbox_id', notification_id);
END;
$$;

-- Leases can be reclaimed only BEFORE the externally observable send.
-- 'sending' is intentionally never auto-reclaimed: a crash/timeout may have delivered.
CREATE FUNCTION public.transition_clicksign_notification(p_id uuid, p_token uuid, p_action text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE n public.clicksign_notification_outbox%ROWTYPE;
BEGIN
  SELECT * INTO n FROM public.clicksign_notification_outbox WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Notification not found'; END IF;
  IF p_token IS NULL THEN RAISE EXCEPTION 'Claim token required'; END IF;
  IF p_action = 'claim' THEN
    IF n.state = 'pending' OR (n.state = 'processing' AND n.lease_until < now()) THEN
      UPDATE public.clicksign_notification_outbox SET state = 'processing', claim_token = p_token,
        lease_until = now() + interval '5 minutes', updated_at = now() WHERE id = p_id RETURNING * INTO n;
      RETURN to_jsonb(n) || jsonb_build_object('claimed', true);
    END IF;
    RETURN to_jsonb(n) || jsonb_build_object('claimed', false);
  END IF;
  IF n.claim_token IS DISTINCT FROM p_token THEN RAISE EXCEPTION 'Stale notification claim'; END IF;
  IF (p_action IN ('pending','sending','skipped') AND n.state = 'processing') OR
     (p_action = 'sent' AND n.state = 'sending') THEN
    UPDATE public.clicksign_notification_outbox SET state = p_action, updated_at = now()
      WHERE id = p_id RETURNING * INTO n;
    RETURN to_jsonb(n);
  END IF;
  RAISE EXCEPTION 'Invalid notification transition: % -> %', n.state, p_action;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_clicksign_document(text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.transition_clicksign_notification(uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_clicksign_document(text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.transition_clicksign_notification(uuid,uuid,text) TO service_role;
COMMIT;
