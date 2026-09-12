-- Atomic, idempotent proposal approval (security/correctness batch, FIN-02).
-- Fixes the race condition in supabase/functions/approve-proposal/index.ts:
-- separate SELECT + UPDATE + INSERT let two concurrent requests both read
-- the sent status, both pass validation, and both succeed, duplicating the
-- approval interaction and (depending on downstream triggers/consumers)
-- potentially double firing whatever reacts to the approval.
--
-- This RPC does the whole validate then transition sequence under a single
-- row lock (FOR UPDATE): a second concurrent call blocks until the first
-- commits, then re-reads the already approved status inside the same
-- transaction and is correctly rejected instead of racing ahead.
BEGIN;

CREATE OR REPLACE FUNCTION public.approve_proposal_atomic(
  p_proposal_id uuid,
  p_share_token uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal record;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  SELECT id, status, prospect_id, share_token, published_at, valid_until
    INTO v_proposal
    FROM public.proposals
    WHERE id = p_proposal_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_proposal.share_token IS DISTINCT FROM p_share_token THEN
    RAISE EXCEPTION 'Invalid token' USING ERRCODE = '42501';
  END IF;

  IF v_proposal.published_at IS NULL THEN
    RAISE EXCEPTION 'Proposal is not published' USING ERRCODE = '55000';
  END IF;

  -- Same rule the edge function used to enforce in application code and
  -- the public UI mirrors client side (src/lib/dateRules.ts): valid_until
  -- is a plain date column with no timezone of its own, and the business
  -- operates in America/Sao_Paulo, so being valid through this day means
  -- through the end of that day locally, not UTC.
  IF v_proposal.valid_until IS NOT NULL AND v_proposal.valid_until < v_today THEN
    RAISE EXCEPTION 'Proposal has expired' USING ERRCODE = '55001';
  END IF;

  IF v_proposal.status NOT IN ('sent', 'negotiating') THEN
    RAISE EXCEPTION 'Proposal cannot be approved in current status: %', v_proposal.status
      USING ERRCODE = '55002';
  END IF;

  UPDATE public.proposals SET status = 'approved' WHERE id = p_proposal_id;

  IF v_proposal.prospect_id IS NOT NULL THEN
    INSERT INTO public.prospect_interactions (prospect_id, type, content)
    VALUES (v_proposal.prospect_id, 'approval', 'Proposta aprovada pelo cliente');
  END IF;

  RETURN jsonb_build_object('success', true, 'proposal_id', p_proposal_id);
END $$;

-- Called only from supabase/functions/approve-proposal using the service
-- role client. There is no Supabase Auth session in this public facing
-- flow; knowledge of share_token, validated above under the lock, is the
-- authorization. Not exposed to anon or authenticated directly, so a
-- browser client cannot bypass the edge function request handling.
REVOKE ALL ON FUNCTION public.approve_proposal_atomic(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_proposal_atomic(uuid, uuid) TO service_role;

COMMIT;
