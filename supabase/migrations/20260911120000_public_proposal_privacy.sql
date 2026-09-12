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

-- "Customer view published proposals/proposal_days/proposal_day_items"
-- correctly scoped OWNERSHIP (published_at + prospect.email = auth.email())
-- but still granted SELECT * on the full row to `authenticated`, same
-- column-level leak (cost_price/commission_percent/supplier_id/
-- internal_costs) via a different path: a logged-in customer viewing their
-- OWN published proposal. The only consumer was Header.tsx (fetches the
-- customer's own proposal slug/share_token for a nav link); replaced below
-- by get_my_published_proposal_link(), which returns just those two fields.
DROP POLICY IF EXISTS "Customer view published proposals" ON public.proposals;
DROP POLICY IF EXISTS "Customer view published proposal_days" ON public.proposal_days;
DROP POLICY IF EXISTS "Customer view published proposal_day_items" ON public.proposal_day_items;

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

-- ============ prospects: "Customer can view own prospect" let a logged-in ============
-- ============ customer SELECT * on their own CRM record -- notes, tags,   ============
-- ============ stage_id, priority/potential, source, etc: internal sales   ============
-- ============ annotations, not customer-facing data. No replacement RPC   ============
-- ============ needed here: the client-side reads that relied on it        ============
-- ============ (AuthModal/WishlistReservationForm/ItineraryReservationForm) ============
-- ============ are being removed in favor of the existing                  ============
-- ============ auto_create_prospect_from_quote trigger on quote_requests.  ============
DROP POLICY IF EXISTS "Customer can view own prospect" ON public.prospects;

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
  v_items_subtotal numeric;
  v_items_discount_amount numeric;
  v_net_per_person numeric; -- NULL, not 0, when there is no valid paying headcount
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

  -- v_show_breakdown: EFFECTIVE visibility for THIS response only (decides
  -- which fields to include below). It is intentionally NOT the same value
  -- as the 'show_price_breakdown' key returned in the payload -- that key
  -- must reflect the raw saved column so the admin toggle can show/flip the
  -- real client-facing state, not "always true because I'm an admin".
  v_show_breakdown := v_is_admin OR v_proposal.show_price_breakdown;
  -- Type-checked before casting: a malformed/legacy atmos_service blob where
  -- price_per_person_day or num_courtesies is itself an object/array would
  -- otherwise either crash this call (bad ::numeric/::int cast) or, for the
  -- JSON text extraction further down, serialize nested content through ->>.
  v_atmos_ppd := CASE WHEN jsonb_typeof(v_proposal.atmos_service->'price_per_person_day') = 'number'
    THEN (v_proposal.atmos_service->>'price_per_person_day')::numeric ELSE 0 END;
  v_num_courtesies := CASE WHEN jsonb_typeof(v_proposal.atmos_service->'num_courtesies') = 'number'
    THEN (v_proposal.atmos_service->>'num_courtesies')::int ELSE 0 END;
  v_num_paying := GREATEST(COALESCE(v_proposal.num_people, 1) - v_num_courtesies, 0);

  -- Deliberately NOT re-deriving a per-person/per-day pricing pipeline here.
  -- Per the authoritative admin-side formula (ProposalFormDialog):
  --   subtotal      = SUM(lineTotal(value, qty)) over items ONLY -- it does
  --                    NOT include atmos_service or accommodation revenue.
  --   items_discount = subtotal * discount_percent/100 + discount_fixed
  --                    (both components apply together, not either/or).
  --   total          = (subtotal - items_discount + atmos revenue +
  --                    accommodation revenue) with tax applied -- a pipeline
  --                    this RPC does not have full visibility into (guide
  --                    proportional split, courtesy-adjusted atmos
  --                    allocation, per-room accommodation pricing) and must
  --                    not try to reconstruct.
  -- So `subtotal` is surfaced as an ITEMS-ONLY, GROUP-level figure (labeled
  -- as such in the UI, never divided by num_people as if it were a
  -- per-person "what you pay" number), and the only per-person price shown
  -- is net_per_person, derived from the one number that IS already fully
  -- authoritative end-to-end: the persisted `total`.
  v_items_subtotal := v_proposal.subtotal;
  v_items_discount_amount := v_items_subtotal * (v_proposal.discount_percent / 100) + v_proposal.discount_fixed;
  -- NULL (not a fabricated 0) when there's no valid paying headcount --
  -- e.g. courtesies >= num_people, an inconsistent state that should read
  -- as "price unavailable", never as "free".
  v_net_per_person := CASE WHEN v_num_paying > 0 THEN v_proposal.total / v_num_paying ELSE NULL END;

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
    -- Whitelisted: payment_terms is admin-authored jsonb: only the three
    -- fields the UI renders travel to the client, nothing else that might
    -- get added to that blob later. Each field is type-checked before
    -- extraction -- ->> on a JSON value that is itself an object/array
    -- serializes that whole nested structure to text, which would smuggle
    -- through anything hidden under an allowed key (e.g. label: {public:
    -- "...", secret: "..."}). installments itself is checked to actually be
    -- an array (jsonb_array_elements raises on non-array input), and each
    -- element must be a JSON object, not a stray scalar.
    'payment_terms', CASE WHEN v_proposal.payment_terms IS NULL THEN NULL ELSE jsonb_build_object(
      'installments', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'label', CASE WHEN jsonb_typeof(inst->'label') = 'string' THEN inst->>'label' ELSE NULL END,
          'percent', CASE WHEN jsonb_typeof(inst->'percent') = 'number' THEN (inst->>'percent')::numeric ELSE NULL END,
          'due_rule', CASE WHEN jsonb_typeof(inst->'due_rule') = 'string' THEN inst->>'due_rule' ELSE NULL END
        )), '[]'::jsonb)
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(v_proposal.payment_terms->'installments') = 'array'
            THEN v_proposal.payment_terms->'installments'
            ELSE '[]'::jsonb
          END
        ) inst
        WHERE jsonb_typeof(inst) = 'object'
      )
    ) END,
    -- Raw saved flag (NOT OR'd with is_admin_view): the admin toggle needs
    -- to see and flip the real client-facing state, not "always true".
    'show_price_breakdown', v_proposal.show_price_breakdown,
    'is_admin_view', v_is_admin,
    -- Public aggregates: always present, regardless of show_price_breakdown.
    -- items_subtotal/items_discount_amount are GROUP-level and items-only
    -- (see comment above v_items_subtotal) -- never divide these by
    -- num_people/num_paying and present the result as a per-person price.
    -- net_per_person is the one unambiguous per-person figure: the fully
    -- authoritative persisted `total`, divided by paying headcount.
    'num_paying', v_num_paying,
    'num_courtesies', v_num_courtesies,
    'items_subtotal', v_items_subtotal,
    'items_discount_amount', v_items_discount_amount,
    'net_per_person', v_net_per_person,
    'atmos_service', CASE WHEN v_proposal.atmos_service IS NULL THEN NULL ELSE jsonb_build_object(
      -- price_per_person_day is a per-line figure (feeds the itemized
      -- "Curadoria & Logística" row) -- only returned when the breakdown is
      -- actually visible. internal_costs is never returned, admin or not.
      'price_per_person_day', CASE WHEN v_show_breakdown THEN v_atmos_ppd ELSE NULL END,
      -- Type-checked for the same reason as payment_terms above: a
      -- description value that is itself an object would otherwise
      -- serialize (and leak) whatever is nested inside it.
      'description', CASE WHEN jsonb_typeof(v_proposal.atmos_service->'description') = 'string'
        THEN v_proposal.atmos_service->>'description' ELSE NULL END,
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
  'Public/token-based read path for the shared proposal page. Enforces published_at for non-admins, verifies the token, and returns an explicit column projection only -- never proposal_costs, sellers, cost_price, commission_percent, supplier_id, atmos_service.internal_costs, or proposal_accommodations.rooms. Per-item value/value_text and atmos_service.price_per_person_day are gated by show_price_breakdown (raw saved flag, never combined with admin). Public aggregates (items_subtotal/items_discount_amount, group-level and items-only; net_per_person, from the authoritative persisted total) are always returned and deliberately do not re-derive the admin-side pricing pipeline (atmos/accommodation revenue, courtesy-adjusted allocation).';

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

-- ============ get_my_published_proposal_link(): replaces the dropped ============
-- ============ "Customer view published *" policies for Header.tsx.       ============
CREATE OR REPLACE FUNCTION public.get_my_published_proposal_link()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  -- Same ownership rule the dropped policies used: published proposal whose
  -- prospect's email matches the caller's own auth email. Only slug and
  -- share_token travel back -- never subtotal/atmos_service/cost fields.
  SELECT jsonb_build_object('slug', pr.slug, 'share_token', pr.share_token)
  INTO v_result
  FROM public.proposals pr
  JOIN public.prospects p ON p.id = pr.prospect_id
  WHERE pr.published_at IS NOT NULL
    AND p.email = auth.email()
  ORDER BY pr.created_at DESC
  LIMIT 1;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_published_proposal_link() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_published_proposal_link() TO authenticated;

COMMENT ON FUNCTION public.get_my_published_proposal_link() IS
  'Returns {slug, share_token} for the caller''s own most recent published proposal (ownership via auth.email() = prospects.email, same rule the dropped "Customer view published proposals" policy used), or NULL. Used by Header.tsx instead of a direct proposals/prospects select.';
