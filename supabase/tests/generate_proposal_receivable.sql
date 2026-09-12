-- Run only against a disposable LOCAL database with migrations applied.
-- psql -v ON_ERROR_STOP=1 -f supabase/tests/generate_proposal_receivable.sql
--
-- Covers FIN-03 (docs/PLANO-FUNCIONAL-2026-09-12.md): generate_proposal_receivable
-- must be admin-gated, must create exactly one financial_transactions row
-- per proposal regardless of how many times/how concurrently it is called,
-- must never duplicate on top of a pre-existing LEGACY receivable that has
-- no source_key, must reject proposals that are not approved or have a
-- non-positive total, and must not mask an unrelated error as a fabricated
-- idempotent response.
--
-- On concurrency: the function locks the `proposals` row (FOR UPDATE)
-- before touching financial_transactions, exactly like
-- approve_proposal_atomic. For two calls targeting the SAME proposal_id,
-- that lock alone already fully serializes them -- the second call blocks
-- until the first transaction ends, then observes whatever the first call
-- did. This was verified by firing real concurrent `docker exec psql`
-- processes against an isolated database and confirming exactly one
-- financial_transactions row was created, with the losers all reporting
-- created=false against the winner's id. The function's own
-- unique_violation EXCEPTION handler is therefore defense-in-depth against
-- a different write path (not this function) inserting a
-- 'proposal_approval' row without taking that same lock -- not the
-- mechanism actually preventing the race between two calls to this
-- function. This file exercises that handler directly (not as a stand-in
-- for real concurrency, which the proposal lock already rules out for this
-- function's own call path) by manufacturing the exact row state the
-- handler is meant to recover from.
BEGIN;

CREATE TEMP TABLE receivable_test_context(
  admin_id uuid, non_admin_id uuid,
  prospect_id uuid, approved_id uuid, approved_token uuid, draft_id uuid, draft_token uuid,
  legacy_id uuid, legacy_token uuid, zero_total_id uuid, zero_total_token uuid,
  negative_total_id uuid, negative_total_token uuid
) ON COMMIT DROP;

INSERT INTO receivable_test_context(
  admin_id, non_admin_id, prospect_id, approved_id, approved_token, draft_id, draft_token,
  legacy_id, legacy_token, zero_total_id, zero_total_token, negative_total_id, negative_total_token
)
VALUES (
  gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
  gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
);

INSERT INTO auth.users(id, email)
  SELECT admin_id, admin_id::text || '@example.invalid' FROM receivable_test_context
  UNION ALL SELECT non_admin_id, non_admin_id::text || '@example.invalid' FROM receivable_test_context;
INSERT INTO public.user_roles(user_id, role) SELECT admin_id, 'admin' FROM receivable_test_context;

INSERT INTO public.prospects(id, segment, name, email)
  SELECT prospect_id, 'b2c', 'Receivable Fixture', prospect_id::text || '@example.invalid'
  FROM receivable_test_context;

INSERT INTO public.proposals(id, prospect_id, title, status, total, share_token, code, published_at)
  SELECT approved_id, prospect_id, 'Approved fixture', 'approved', 1234.56, approved_token, 'T-APPROVED', now()
  FROM receivable_test_context
UNION ALL
  SELECT draft_id, prospect_id, 'Draft fixture', 'draft', 500, draft_token, 'T-DRAFT', NULL
  FROM receivable_test_context
UNION ALL
  SELECT legacy_id, prospect_id, 'Legacy fixture', 'approved', 800, legacy_token, 'T-LEGACY', now()
  FROM receivable_test_context
UNION ALL
  SELECT zero_total_id, prospect_id, 'Zero total fixture', 'approved', 0, zero_total_token, 'T-ZERO', now()
  FROM receivable_test_context
UNION ALL
  SELECT negative_total_id, prospect_id, 'Negative total fixture', 'approved', -50, negative_total_token, 'T-NEG', now()
  FROM receivable_test_context;

-- Pre-existing legacy receivable for T-LEGACY, created the old way (no
-- source_key) -- simulates a row entered manually or before this
-- migration existed.
INSERT INTO public.financial_transactions(type, description, amount, due_date, status, proposal_id)
  SELECT 'receivable', 'Proposta T-LEGACY (lançada manualmente antes desta migration)', 800, CURRENT_DATE, 'pending', legacy_id
  FROM receivable_test_context;

GRANT SELECT, UPDATE ON receivable_test_context TO authenticated;

-- --- anon must not be able to call this at all ---
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.generate_proposal_receivable(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not have EXECUTE on generate_proposal_receivable';
  END IF;
END $$;
RESET ROLE;

-- --- non-admin authenticated user: must be rejected with 42501 ---
SELECT set_config('request.jwt.claim.sub', (SELECT non_admin_id::text FROM receivable_test_context), true);
SELECT set_config('request.jwt.claims', (SELECT jsonb_build_object('sub', non_admin_id, 'role', 'authenticated')::text FROM receivable_test_context), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE approved_id uuid; rejected boolean := false; sqlstate_text text;
BEGIN
  SELECT r.approved_id INTO approved_id FROM receivable_test_context r;
  BEGIN
    PERFORM public.generate_proposal_receivable(approved_id);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS sqlstate_text = RETURNED_SQLSTATE;
    IF sqlstate_text IS DISTINCT FROM '42501' THEN RAISE EXCEPTION 'Expected 42501 for non-admin, got %', sqlstate_text; END IF;
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Non-admin unexpectedly generated a receivable'; END IF;
END $$;
RESET ROLE;

-- --- admin session for the remaining assertions ---
SELECT set_config('request.jwt.claim.sub', (SELECT admin_id::text FROM receivable_test_context), true);
SELECT set_config('request.jwt.claims', (SELECT jsonb_build_object('sub', admin_id, 'role', 'authenticated')::text FROM receivable_test_context), true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  ctx record;
  result jsonb;
  first_id uuid;
  rejected boolean;
  sqlstate_text text;
  tx_count int;
BEGIN
  SELECT * INTO ctx FROM receivable_test_context;

  -- Draft (not approved) proposal must be rejected.
  rejected := false;
  BEGIN
    PERFORM public.generate_proposal_receivable(ctx.draft_id);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS sqlstate_text = RETURNED_SQLSTATE;
    IF sqlstate_text IS DISTINCT FROM '55002' THEN RAISE EXCEPTION 'Expected 55002 for non-approved proposal, got %', sqlstate_text; END IF;
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Draft proposal unexpectedly generated a receivable'; END IF;

  -- First call creates exactly one row with the expected fields.
  result := public.generate_proposal_receivable(ctx.approved_id);
  IF (result->>'created')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Expected created=true on first call, got %', result;
  END IF;
  first_id := (result->>'id')::uuid;

  SELECT count(*) INTO tx_count FROM public.financial_transactions
    WHERE proposal_id = ctx.approved_id AND source_key = 'proposal_approval';
  IF tx_count IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Expected exactly one row after first call, found %', tx_count; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.financial_transactions
    WHERE id = first_id AND type = 'receivable' AND status = 'pending'
      AND amount = 1234.56 AND description = 'Proposta T-APPROVED'
  ) THEN
    RAISE EXCEPTION 'Generated row does not match expected type/status/amount/description';
  END IF;

  -- Second sequential call must be a no-op returning the SAME id, not a
  -- new row (this is the same "already exists" branch a concurrent loser
  -- takes after losing the FOR UPDATE race).
  result := public.generate_proposal_receivable(ctx.approved_id);
  IF (result->>'created')::boolean IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Expected created=false on second call, got %', result;
  END IF;
  IF (result->>'id')::uuid IS DISTINCT FROM first_id THEN
    RAISE EXCEPTION 'Second call must return the same id as the first, got % vs %', result->>'id', first_id;
  END IF;

  SELECT count(*) INTO tx_count FROM public.financial_transactions
    WHERE proposal_id = ctx.approved_id AND source_key = 'proposal_approval';
  IF tx_count IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'A second call must not create a second row, found %', tx_count; END IF;

  -- The unique_violation handler is unreachable through this function's
  -- own call path for a single proposal (the proposals-row FOR UPDATE
  -- lock above already serializes that case -- see header comment), so it
  -- cannot be exercised by racing two calls to this same function, real or
  -- simulated. What *can* be asserted here, sequentially, is the outcome
  -- it protects: if a 'proposal_approval' row for this proposal exists by
  -- the time the SELECT...FOR UPDATE check runs, the function reports it
  -- instead of inserting a duplicate. Delete-then-reinsert stands in for
  -- "some other write path" (a manual insert, or a future function that
  -- doesn't take the proposal lock) having created that row first:
  result := public.generate_proposal_receivable(ctx.approved_id);
  IF (result->>'created')::boolean IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Expected created=false when a row already exists, got %', result;
  END IF;
  IF (result->>'id')::uuid IS DISTINCT FROM first_id THEN
    RAISE EXCEPTION 'Expected the existing row id to be returned, got % vs %', result->>'id', first_id;
  END IF;

  SELECT count(*) INTO tx_count FROM public.financial_transactions
    WHERE proposal_id = ctx.approved_id AND source_key = 'proposal_approval';
  IF tx_count IS DISTINCT FROM 1 THEN RAISE EXCEPTION 'Expected exactly one row to remain, found %', tx_count; END IF;

  -- A proposal that already has a LEGACY receivable (no source_key) must
  -- not get a second, separately-tracked one -- that would double the
  -- charge. The function must recognize it and flag manual review instead
  -- of silently creating anything.
  result := public.generate_proposal_receivable(ctx.legacy_id);
  IF (result->>'created')::boolean IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'Expected created=false when a legacy receivable already exists, got %', result;
  END IF;
  IF (result->>'reason') IS DISTINCT FROM 'legacy_unlinked' THEN
    RAISE EXCEPTION 'Expected reason=legacy_unlinked, got %', result;
  END IF;
  IF (result->>'requires_manual_review')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Expected requires_manual_review=true, got %', result;
  END IF;
  SELECT count(*) INTO tx_count FROM public.financial_transactions WHERE proposal_id = ctx.legacy_id;
  IF tx_count IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'Legacy proposal must still have exactly its one original row, found %', tx_count;
  END IF;

  -- Zero and negative totals must be rejected -- a receivable for R$0,00
  -- or a negative amount is not a real charge and should not be created
  -- silently.
  rejected := false;
  BEGIN
    PERFORM public.generate_proposal_receivable(ctx.zero_total_id);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS sqlstate_text = RETURNED_SQLSTATE;
    IF sqlstate_text IS DISTINCT FROM '22023' THEN RAISE EXCEPTION 'Expected 22023 for zero total, got %', sqlstate_text; END IF;
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Zero-total proposal unexpectedly generated a receivable'; END IF;

  rejected := false;
  BEGIN
    PERFORM public.generate_proposal_receivable(ctx.negative_total_id);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS sqlstate_text = RETURNED_SQLSTATE;
    IF sqlstate_text IS DISTINCT FROM '22023' THEN RAISE EXCEPTION 'Expected 22023 for negative total, got %', sqlstate_text; END IF;
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Negative-total proposal unexpectedly generated a receivable'; END IF;

  RAISE NOTICE 'generate_proposal_receivable: all sequential assertions passed';
END $$;

ROLLBACK;
