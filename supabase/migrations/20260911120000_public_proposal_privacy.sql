-- Privacy hardening for the public proposal share flow.
--
-- *** STATUS: SQL NOT EXECUTED / NOT VALIDATED AGAINST A LIVE DATABASE. ***
-- Local Postgres (Docker) was unavailable in this environment (disk full /
-- image pull failed mid-session). This migration was reviewed statically
-- against the current schema in supabase/migrations/*.sql (column names,
-- types and existing policies were cross-checked by hand) but has NOT been
-- applied or smoke-tested anywhere. Run it against a local/staging Supabase
-- instance and exercise get_public_proposal / submit_proposal_feedback
-- before promoting to production.
--
-- Problem: "Anon view shared proposals" (and the equivalent policies on
-- proposal_days / proposal_day_items / proposal_accommodations) only checked
-- `share_token IS NOT NULL`. Since share_token defaults to gen_random_uuid()
-- on every row, this is true for virtually every proposal, so any anon (or
-- even authenticated) caller could SELECT the full row of ANY proposal --
-- draft or negotiating included -- with no requirement that published_at be
-- set and no requirement that the caller actually supply the matching token.
-- That exposed internal-only columns (atmos_service->internal_costs,
-- proposal_day_items.cost_price/commission_percent/supplier_id, seller_id,
-- prospect_id, etc.) to the public internet, since RLS is row-level, not
-- column-level, and ProposalPublic.tsx fetched `select(*, ...)`.
-- The same share_token-presence-only pattern also applied to
-- proposal_feedback, which additionally never checked that the caller's
-- token matched the specific proposal (any guessed/leaked proposal_id with
-- a published sibling proposal would pass the EXISTS check).
--
-- Fix: remove ALL direct anon/authenticated table access for the public
-- share-token flow and replace it with two SECURITY DEFINER RPCs:
--   - get_public_proposal(p_token): read path. Requires published_at for
--     non-admins, verifies the token, and returns an explicit, hand-picked
--     projection. Per-line pricing (item value/value_text and
--     atmos_service.price_per_person_day) is only included when the
--     proposal's show_price_breakdown flag is on (or the caller is admin);
--     the public-facing totals (subtotal/discount/net per person, per-day
--     rolled-up totals) are computed here and always returned, so the page
--     never needs raw line items to render the bottom-line price.
--   - submit_proposal_feedback(...): write path for the "Solicitar Ajustes"
--     dialog. Requires proposal_id + share_token to match a published
--     proposal; anon/authenticated get no direct INSERT grant on
--     proposal_feedback at all anymore.

-- ============ proposals.show_price_breakdown ============
-- Per-line pricing is hidden from clients by default; only staff can flip it
-- on for a specific proposal. Admin editing already goes through the
-- existing "Admins full access proposals" policy, so no RLS change is
-- needed for the write side of this column.
ALTER TABLE public.proposals
  ADD COLUMN IF NOT EXISTS show_price_breakdown boolean NOT NULL DEFAULT false;

-- ============ Drop the overly-permissive anon/authenticated policies ============
DROP POLICY IF EXISTS "Anon view shared proposals" ON public.proposals;
DROP POLICY IF EXISTS "Anon view shared proposal_days" ON public.proposal_days;
DROP POLICY IF EXISTS "Anon view shared proposal_day_items" ON public.proposal_day_items;
DROP POLICY IF EXISTS "Anon view shared proposal_accommodations" ON public.proposal_accommodations;

-- proposal_feedback: drop the anon-facing policies entirely. Nothing in the
-- current frontend actually SELECTs proposal_feedback as anon (only admin
-- screens read it, under the existing "Admins can manage proposal_feedback"
-- policy, which is untouched); the public dialog only inserts, and that now
-- goes exclusively through submit_proposal_feedback below.
DROP POLICY IF EXISTS "Anyone can insert feedback on shared proposals" ON public.proposal_feedback;
DROP POLICY IF EXISTS "Anyone can view feedback on shared proposals" ON public.proposal_feedback;

-- ============ sellers: was fully public (USING (true)), unrelated to any ============
-- ============ proposal or token. Not used by the public proposal page.   ============
DROP POLICY IF EXISTS "Public can read sellers for proposals" ON public.sellers;

-- ============ get_public_proposal(p_token): the only path for public reads ============
CREATE OR REPLACE FUNCTION public.get_public_proposal(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_proposal public.proposals%ROWTYPE;
  v_is_admin boolean;
  v_show_breakdown boolean;
  v_atmos_ppd numeric;
  v_num_courtesies int;
  v_num_paying numeric;
  v_num_days_calc numeric;
  v_day_totals jsonb;
  v_subtotal_per_person numeric;
  v_discount_amount_per_person numeric;
  v_net_per_person numeric;
  v_result jsonb;
BEGIN
  IF p_token IS NULL OR p_token = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_proposal
  FROM public.proposals
  WHERE (slug IS NOT NULL AND slug = p_token)
     OR (share_token IS NOT NULL AND share_token::text = p_token)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_is_admin := public.has_role(auth.uid(), 'admin'::app_role);

  -- Non-admin callers may only see published proposals. This is the core
  -- fix: previously any caller who knew (or guessed) a token could read an
  -- unpublished proposal in full.
  IF NOT v_is_admin AND v_proposal.published_at IS NULL THEN
    RETURN NULL;
  END IF;

  v_show_breakdown := v_is_admin OR v_proposal.show_price_breakdown;
  v_atmos_ppd := COALESCE((v_proposal.atmos_service->>'price_per_person_day')::numeric, 0);
  v_num_courtesies := COALESCE((v_proposal.atmos_service->>'num_courtesies')::int, 0);
  v_num_paying := GREATEST(1, COALESCE(v_proposal.num_people, 1) - v_num_courtesies);

  -- Per-day rolled-up total per person (same formula the page used to
  -- compute client-side from raw item values). Always safe to return in
  -- full -- it's the price the customer pays for that day, not a line-item
  -- cost/margin breakdown -- so the bottom-line figures keep working even
  -- when show_price_breakdown is off and the itemized list is hidden.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'day_number', dn.day_number,
    'total_per_person',
      COALESCE(dn.non_guide_sum, 0)
      + COALESCE(dn.guide_sum, 0) / GREATEST(COALESCE(v_proposal.num_people, 1), 1)
      + v_atmos_ppd
  ) ORDER BY dn.day_number), '[]'::jsonb)
  INTO v_day_totals
  FROM (
    SELECT
      i.day_number,
      SUM(i.value) FILTER (WHERE i.category <> 'Diária Guia ATMOS') AS non_guide_sum,
      SUM(i.value * COALESCE(i.quantity, 1)) FILTER (WHERE i.category = 'Diária Guia ATMOS') AS guide_sum
    FROM public.proposal_day_items i
    WHERE i.proposal_id = v_proposal.id
    GROUP BY i.day_number
  ) dn;

  v_num_days_calc := COALESCE(
    v_proposal.num_days,
    (SELECT COUNT(DISTINCT day_number) FROM public.proposal_day_items WHERE proposal_id = v_proposal.id),
    1
  );

  v_subtotal_per_person := CASE
    WHEN v_proposal.subtotal > 0
      THEN v_proposal.subtotal / GREATEST(COALESCE(v_proposal.num_people, 1), 1) + v_atmos_ppd * v_num_days_calc
    ELSE COALESCE((SELECT SUM((dt->>'total_per_person')::numeric) FROM jsonb_array_elements(v_day_totals) dt), 0)
  END;

  v_net_per_person := CASE WHEN v_num_paying > 0 THEN v_proposal.total / v_num_paying ELSE 0 END;

  v_discount_amount_per_person := CASE
    WHEN v_proposal.discount_percent > 0 THEN v_subtotal_per_person * (v_proposal.discount_percent / 100)
    WHEN v_proposal.discount_fixed > 0 THEN v_proposal.discount_fixed / GREATEST(COALESCE(v_proposal.num_people, 1), 1)
    ELSE 0
  END;

  SELECT jsonb_build_object(
    'id', v_proposal.id,
    'title', v_proposal.title,
    'status', v_proposal.status,
    'notes', v_proposal.notes,
    'num_people', v_proposal.num_people,
    'num_days', v_proposal.num_days,
    'start_date', v_proposal.start_date,
    'end_date', v_proposal.end_date,
    'subtotal', v_proposal.subtotal,
    'discount_percent', v_proposal.discount_percent,
    'discount_fixed', v_proposal.discount_fixed,
    'tax_percent', v_proposal.tax_percent,
    'total', v_proposal.total,
    'valid_until', v_proposal.valid_until,
    'language', v_proposal.language,
    'published_at', v_proposal.published_at,
    'share_token', v_proposal.share_token,
    'contract_url', v_proposal.contract_url,
    'payment_terms', v_proposal.payment_terms,
    'show_price_breakdown', v_show_breakdown,
    'is_admin_view', v_is_admin,
    -- Public aggregates: always present, regardless of show_price_breakdown.
    'num_paying', v_num_paying,
    'num_courtesies', v_num_courtesies,
    'subtotal_per_person', v_subtotal_per_person,
    'discount_amount_per_person', v_discount_amount_per_person,
    'net_per_person', v_net_per_person,
    'day_totals', v_day_totals,
    'atmos_service', CASE WHEN v_proposal.atmos_service IS NULL THEN NULL ELSE jsonb_build_object(
      -- price_per_person_day is a per-line figure (feeds the itemized
      -- "Curadoria & Logística" row) -- only returned when the breakdown is
      -- actually visible. internal_costs is never returned, admin or not.
      'price_per_person_day', CASE WHEN v_show_breakdown THEN v_atmos_ppd ELSE NULL END,
      'description', v_proposal.atmos_service->>'description',
      'num_courtesies', v_num_courtesies
    ) END,
    'prospects', (
      SELECT jsonb_build_object('name', p.name)
      FROM public.prospects p WHERE p.id = v_proposal.prospect_id
    ),
    'proposal_days', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'day_number', d.day_number,
        'description', d.description,
        'observation', d.observation
      )), '[]'::jsonb)
      FROM public.proposal_days d WHERE d.proposal_id = v_proposal.id
    ),
    'proposal_day_items', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', i.id,
        'day_number', i.day_number,
        'day_label', i.day_label,
        'category', i.category,
        'item_name', i.item_name,
        -- Line-level price fields only travel to the client when the
        -- breakdown is actually meant to be visible (admin, or staff opted
        -- in via show_price_breakdown). This is enforced here, in the
        -- payload -- not left to the UI to merely hide with CSS.
        'value', CASE WHEN v_show_breakdown THEN i.value ELSE NULL END,
        'value_text', CASE WHEN v_show_breakdown THEN i.value_text ELSE NULL END,
        'description', i.description,
        'catalog_item_id', i.catalog_item_id,
        'quantity', i.quantity,
        'vehicle_type', i.vehicle_type,
        'start_time', i.start_time,
        'end_time', i.end_time,
        'item_index', i.item_index
      ) ORDER BY i.day_number, i.item_index), '[]'::jsonb)
      FROM public.proposal_day_items i WHERE i.proposal_id = v_proposal.id
    ),
    'proposal_accommodations', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'id', a.id,
        'product_id', a.product_id,
        'checkin_date', a.checkin_date,
        'checkout_date', a.checkout_date,
        'num_nights', a.num_nights,
        'notes', a.notes,
        'is_selected', a.is_selected
        -- NOTE: `rooms` is deliberately omitted. It stores per-room
        -- pricing (price/cost/pricing_type) in one of three historical
        -- shapes, cost included -- and the public proposal page never
        -- reads it (confirmed: no `.rooms` access in ProposalPublic.tsx).
        -- Rather than write a recursive whitelist sanitizer for a field
        -- nothing renders, it's simply not part of the public projection.
      )), '[]'::jsonb)
      FROM public.proposal_accommodations a
      WHERE a.proposal_id = v_proposal.id AND a.is_selected = true
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_proposal(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_proposal(text) TO anon, authenticated;

COMMENT ON FUNCTION public.get_public_proposal(text) IS
  'Public/token-based read path for the shared proposal page. Enforces published_at for non-admins, verifies the token, and returns an explicit column projection only -- never proposal_costs, sellers, cost_price, commission_percent, supplier_id, atmos_service.internal_costs, or proposal_accommodations.rooms. Per-item value/value_text and atmos_service.price_per_person_day are gated by show_price_breakdown (admin always sees them); the public per-person/per-day totals are precomputed here and always returned.';

-- ============ submit_proposal_feedback: the only path for public writes to ============
-- ============ proposal_feedback (the "Solicitar Ajustes" dialog).         ============
CREATE OR REPLACE FUNCTION public.submit_proposal_feedback(
  p_proposal_id uuid,
  p_share_token text,
  p_type text,
  p_content text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  IF p_type NOT IN ('question', 'change_request') THEN
    RAISE EXCEPTION 'invalid feedback type: %', p_type;
  END IF;

  IF p_content IS NULL OR length(trim(p_content)) = 0 THEN
    RAISE EXCEPTION 'content is required';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.proposals
    WHERE id = p_proposal_id
      AND published_at IS NOT NULL
      AND share_token IS NOT NULL
      AND share_token::text = p_share_token
  ) INTO v_ok;

  IF NOT v_ok THEN
    RETURN false;
  END IF;

  INSERT INTO public.proposal_feedback (proposal_id, type, content)
  VALUES (p_proposal_id, p_type, left(trim(p_content), 2000));

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_proposal_feedback(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_proposal_feedback(uuid, text, text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.submit_proposal_feedback(uuid, text, text, text) IS
  'Public write path for the "Solicitar Ajustes" dialog. Requires proposal_id + share_token to match a published proposal; anon/authenticated have no direct INSERT grant on proposal_feedback anymore.';
