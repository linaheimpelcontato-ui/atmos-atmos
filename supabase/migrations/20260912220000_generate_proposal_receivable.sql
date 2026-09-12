-- Idempotent proposal receivable generation (security/correctness batch,
-- FIN-03). Fixes AdminFinanceReceitas.tsx handleGenerateFromProposal, which
-- inserted into financial_transactions unconditionally: no source_key, no
-- existence check. Two bugs in one:
--   1. The already linked check on the frontend was derived only from
--      transactions inside the visible due_date filter window, so a
--      proposal whose existing receivable falls outside that window
--      reappeared as awaiting launch and could be launched again.
--   2. Even inside the window, two rapid clicks (or two admins, or a
--      retried request) raced two plain INSERTs with nothing to stop
--      both from succeeding.
--
-- Reuses the source_key column/unique index already added by
-- 20260911224000_atomic_proposal_bundle.sql
-- (financial_transactions_proposal_source_key_idx on (proposal_id,
-- source_key) WHERE source_key IS NOT NULL) with a fixed key,
-- proposal_approval: the one row representing the receivable
-- auto-generated when this proposal was approved, distinct from manual
-- installments or extra revenue that legitimately share the same
-- proposal_id without this key (per docs/FINANCEIRO-RASTREABILIDADE.md: do
-- not use a bare UNIQUE(proposal_id), parcelas and receitas extras
-- legitimately repeat a proposal).
--
-- Legacy rows (created before this migration existed, or entered manually)
-- have source_key IS NULL and are NOT reassociated automatically. This
-- function only ever refuses to duplicate on top of them and reports that
-- a manual reconciliation is needed, matching the existing convention in
-- save_proposal_bundle and server_proposal_totals for legacy commissions:
-- suspend automatic sync and warn that manual mapping is required.
BEGIN;

CREATE OR REPLACE FUNCTION public.generate_proposal_receivable(
  p_proposal_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal record;
  v_existing_id uuid;
  v_existing_source_key text;
  v_new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  -- Locks the proposal row itself, exactly like approve_proposal_atomic.
  -- This is what actually serializes two concurrent calls for the same
  -- proposal_id: the second call blocks here until the first transaction
  -- commits or rolls back, then re-reads a financial_transactions state
  -- that already reflects whatever the first call did. In normal
  -- operation, with both calls going through this function, the
  -- unique_violation handler below is therefore defense in depth against
  -- a different write path (a future function or migration that also
  -- inserts a proposal_approval row without taking this same lock),
  -- rather than the primary mechanism preventing a duplicate for calls
  -- through this function alone.
  SELECT id, code, title, total, status
    INTO v_proposal
    FROM public.proposals
    WHERE id = p_proposal_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposal not found' USING ERRCODE = 'P0002';
  END IF;

  -- Matches src/lib/proposalStatus.ts (isApprovedProposalStatus): approved
  -- is the value approve-proposal writes today, accepted is the legacy
  -- value on rows written before that rename.
  IF v_proposal.status NOT IN ('approved', 'accepted') THEN
    RAISE EXCEPTION 'Proposal is not approved: %', v_proposal.status USING ERRCODE = '55002';
  END IF;

  IF v_proposal.total IS NULL OR v_proposal.total <= 0 THEN
    RAISE EXCEPTION 'Proposal total must be a positive amount to generate a receivable: %', v_proposal.total
      USING ERRCODE = '22023';
  END IF;

  -- Look for any existing receivable or commission_in already linked to
  -- this proposal, not just one with source_key = proposal_approval. A
  -- legacy row (source_key IS NULL, entered manually or before this
  -- migration existed) still means the proposal has already been billed;
  -- creating a second, separately tracked receivable on top of it would
  -- double the charge. Prefer surfacing our own key if both happen to
  -- exist. This mirrors what the already linked check on
  -- AdminFinanceReceitas.tsx considers (type IN receivable or
  -- commission_in), so the RPC and the UI never disagree about whether a
  -- proposal is already linked.
  SELECT id, source_key
    INTO v_existing_id, v_existing_source_key
    FROM public.financial_transactions
    WHERE proposal_id = p_proposal_id AND type IN ('receivable', 'commission_in')
    ORDER BY (source_key = 'proposal_approval') DESC NULLS LAST, created_at ASC
    LIMIT 1
    FOR UPDATE;

  IF FOUND THEN
    IF v_existing_source_key = 'proposal_approval' THEN
      RETURN jsonb_build_object('created', false, 'id', v_existing_id, 'reason', 'already_generated');
    END IF;
    RETURN jsonb_build_object(
      'created', false, 'id', v_existing_id, 'reason', 'legacy_unlinked', 'requires_manual_review', true
    );
  END IF;

  INSERT INTO public.financial_transactions
      (type, description, amount, due_date, status, proposal_id, source_key)
    VALUES
      ('receivable', 'Proposta ' || COALESCE(v_proposal.code, v_proposal.title),
       v_proposal.total, CURRENT_DATE, 'pending', p_proposal_id, 'proposal_approval')
    RETURNING id INTO v_new_id;

  RETURN jsonb_build_object('created', true, 'id', v_new_id);
EXCEPTION
  WHEN unique_violation THEN
    -- Only treat this as someone else already created the row we wanted if
    -- that row is actually there afterwards. If it is not, some other
    -- constraint fired, or this is a genuine bug, so re-raise the real
    -- error instead of masking it behind a fabricated
    -- created=false/id=null response.
    SELECT id INTO v_existing_id
      FROM public.financial_transactions
      WHERE proposal_id = p_proposal_id AND source_key = 'proposal_approval';
    IF NOT FOUND THEN
      RAISE;
    END IF;
    RETURN jsonb_build_object('created', false, 'id', v_existing_id, 'reason', 'already_generated');
END $$;

-- Called directly from the admin frontend (AdminFinanceReceitas.tsx) by an
-- authenticated admin, same pattern as save_proposal_bundle: internal
-- has_role check, not RLS, since this only touches financial_transactions
-- rows tied to a single proposal rather than the admin own data.
REVOKE ALL ON FUNCTION public.generate_proposal_receivable(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_proposal_receivable(uuid) TO authenticated;

COMMIT;
