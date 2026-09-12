-- Run only against a disposable LOCAL database with migrations applied.
-- psql -v ON_ERROR_STOP=1 -f supabase/tests/approve_proposal_atomic.sql
--
-- Covers FIN-02 (docs/PLANO-FUNCIONAL-2026-09-12.md): approve_proposal_atomic
-- must validate token/publication/expiry/status and transition atomically
-- under a single row lock, so concurrent callers cannot both succeed. The
-- true concurrency case (N simultaneous sessions racing the same proposal)
-- cannot be expressed inside one psql script/transaction — it was verified
-- separately by firing real concurrent `docker exec psql` processes against
-- an isolated database and confirming exactly one success, one
-- prospect_interactions row, and a final status of 'approved'. This file
-- covers the sequential contract: every individual rejection path, and
-- that a second call after a first success is rejected exactly like any
-- other already-approved proposal (the same code path a concurrent loser
-- would hit).
BEGIN;

CREATE TEMP TABLE approve_test_context(
  prospect_id uuid, sent_id uuid, sent_token uuid,
  unpublished_id uuid, unpublished_token uuid,
  expired_id uuid, expired_token uuid
) ON COMMIT DROP;

INSERT INTO approve_test_context(prospect_id, sent_id, sent_token, unpublished_id, unpublished_token, expired_id, expired_token)
VALUES (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid());

INSERT INTO public.prospects(id, segment, name, email)
  SELECT prospect_id, 'b2c', 'Approve Atomic Fixture', prospect_id::text || '@example.invalid'
  FROM approve_test_context;

INSERT INTO public.proposals(id, prospect_id, title, status, total, valid_until, share_token, code, published_at)
  SELECT sent_id, prospect_id, 'Sent fixture', 'sent', 1000, CURRENT_DATE + 30, sent_token, 'T-SENT', now()
  FROM approve_test_context
UNION ALL
  SELECT unpublished_id, prospect_id, 'Unpublished fixture', 'sent', 1000, CURRENT_DATE + 30, unpublished_token, 'T-UNPUB', NULL
  FROM approve_test_context
UNION ALL
  SELECT expired_id, prospect_id, 'Expired fixture', 'sent', 1000, CURRENT_DATE - 1, expired_token, 'T-EXP', now()
  FROM approve_test_context;

DO $$
DECLARE
  ctx record;
  result jsonb;
  rejected boolean;
  sqlstate_text text;
BEGIN
  SELECT * INTO ctx FROM approve_test_context;

  -- Not found.
  rejected := false;
  BEGIN
    PERFORM public.approve_proposal_atomic(gen_random_uuid(), gen_random_uuid());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS sqlstate_text = RETURNED_SQLSTATE;
    IF sqlstate_text IS DISTINCT FROM 'P0002' THEN RAISE EXCEPTION 'Expected P0002 for not-found, got %', sqlstate_text; END IF;
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Non-existent proposal unexpectedly approved'; END IF;

  -- Wrong token.
  rejected := false;
  BEGIN
    PERFORM public.approve_proposal_atomic(ctx.sent_id, gen_random_uuid());
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS sqlstate_text = RETURNED_SQLSTATE;
    IF sqlstate_text IS DISTINCT FROM '42501' THEN RAISE EXCEPTION 'Expected 42501 for wrong token, got %', sqlstate_text; END IF;
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Wrong share_token unexpectedly approved'; END IF;
  IF (SELECT status FROM public.proposals WHERE id = ctx.sent_id) IS DISTINCT FROM 'sent' THEN
    RAISE EXCEPTION 'Status must be untouched after a rejected wrong-token attempt';
  END IF;

  -- Not published.
  rejected := false;
  BEGIN
    PERFORM public.approve_proposal_atomic(ctx.unpublished_id, ctx.unpublished_token);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS sqlstate_text = RETURNED_SQLSTATE;
    IF sqlstate_text IS DISTINCT FROM '55000' THEN RAISE EXCEPTION 'Expected 55000 for unpublished, got %', sqlstate_text; END IF;
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Unpublished proposal unexpectedly approved'; END IF;

  -- Expired.
  rejected := false;
  BEGIN
    PERFORM public.approve_proposal_atomic(ctx.expired_id, ctx.expired_token);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS sqlstate_text = RETURNED_SQLSTATE;
    IF sqlstate_text IS DISTINCT FROM '55001' THEN RAISE EXCEPTION 'Expected 55001 for expired, got %', sqlstate_text; END IF;
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Expired proposal unexpectedly approved'; END IF;

  -- Happy path.
  result := public.approve_proposal_atomic(ctx.sent_id, ctx.sent_token);
  IF (result->>'success')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Expected success=true, got %', result;
  END IF;
  IF (SELECT status FROM public.proposals WHERE id = ctx.sent_id) IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Status must be approved after successful call';
  END IF;
  IF (SELECT count(*) FROM public.prospect_interactions
        WHERE prospect_id = ctx.prospect_id AND type = 'approval') IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'Expected exactly one approval interaction to be logged';
  END IF;

  -- Same call again (the sequential analogue of a concurrent loser): must
  -- be rejected, not silently re-approved, and must not log a second
  -- interaction.
  rejected := false;
  BEGIN
    PERFORM public.approve_proposal_atomic(ctx.sent_id, ctx.sent_token);
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS sqlstate_text = RETURNED_SQLSTATE;
    IF sqlstate_text IS DISTINCT FROM '55002' THEN RAISE EXCEPTION 'Expected 55002 for already-approved, got %', sqlstate_text; END IF;
    rejected := true;
  END;
  IF NOT rejected THEN RAISE EXCEPTION 'Already-approved proposal unexpectedly approved again'; END IF;
  IF (SELECT count(*) FROM public.prospect_interactions
        WHERE prospect_id = ctx.prospect_id AND type = 'approval') IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'A second call must not create a second approval interaction';
  END IF;

  -- anon must not be able to call this directly (only service_role, per the
  -- REVOKE/GRANT in the migration) -- checked by privilege, not by
  -- attempting the call under `anon` role, since PostgREST/psql role
  -- switching for `anon` needs a real anon session; has_function_privilege
  -- is the same technique used elsewhere in this test suite for ACL checks.
  IF has_function_privilege('anon', 'public.approve_proposal_atomic(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'anon must not have EXECUTE on approve_proposal_atomic';
  END IF;
  IF has_function_privilege('authenticated', 'public.approve_proposal_atomic(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated must not have EXECUTE on approve_proposal_atomic (service_role only)';
  END IF;

  RAISE NOTICE 'approve_proposal_atomic: all assertions passed';
END $$;

ROLLBACK;
