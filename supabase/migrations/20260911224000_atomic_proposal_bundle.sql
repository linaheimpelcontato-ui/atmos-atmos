-- Atomic admin save; never delete/recreate financial history by description.
ALTER TABLE public.financial_transactions ADD COLUMN source_key text;
CREATE UNIQUE INDEX financial_transactions_proposal_source_key_idx
  ON public.financial_transactions(proposal_id, source_key) WHERE source_key IS NOT NULL;

CREATE OR REPLACE FUNCTION public.save_proposal_bundle(
  p_id uuid, p_proposal jsonb, p_items jsonb, p_costs jsonb,
  p_days jsonb, p_accommodations jsonb, p_commissions jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_legacy boolean;
  v_tx public.financial_transactions;
  v_comm jsonb;
  v_prospect public.prospects;
  v_name text;
  v_current public.proposals;
  v_row jsonb;
  v_ids uuid[];
  v_child_id uuid;
  v_item public.proposal_day_items;
  v_cost public.proposal_costs;
  v_day public.proposal_days;
  v_acc public.proposal_accommodations;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_proposal) IS DISTINCT FROM 'object'
    OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_costs) IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_days) IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_accommodations) IS DISTINCT FROM 'array'
    OR jsonb_typeof(p_commissions) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Complete proposal bundle required';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_accommodations) a
    CROSS JOIN LATERAL jsonb_array_elements(a->'rooms') u
    CROSS JOIN LATERAL jsonb_array_elements(u->'rooms') r
    WHERE (a->>'is_selected')::boolean AND (r->>'available')::boolean AND (r->>'units')::numeric > 0
      AND (r->>'commission_percent' IS NULL OR (r->>'commission_percent')::numeric NOT BETWEEN 0 AND 100)
  ) THEN RAISE EXCEPTION 'Confirme as comissões históricas por modalidade'; END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.proposals (title, status, segment, contract_status, payment_status, prospect_id, seller_id, guide_id, subtotal, discount_percent, discount_fixed, tax_percent, total, notes, valid_until, num_people, num_days, start_date, end_date, language, atmos_service, slug, payment_terms)
      SELECT title, status, segment, contract_status, payment_status, prospect_id, seller_id, guide_id, subtotal, discount_percent, discount_fixed, tax_percent, total, notes, valid_until, num_people, num_days, start_date, end_date, language, atmos_service, slug, payment_terms FROM jsonb_populate_record(NULL::public.proposals, p_proposal)
      RETURNING id INTO v_id;
  ELSE
    SELECT * INTO STRICT v_current FROM public.proposals WHERE id = p_id FOR UPDATE;
    v_id := v_current.id;
    UPDATE public.proposals SET (title, status, segment, contract_status, payment_status, prospect_id, seller_id, guide_id, subtotal, discount_percent, discount_fixed, tax_percent, total, notes, valid_until, num_people, num_days, start_date, end_date, language, atmos_service, slug, payment_terms) =
      (SELECT title, status, segment, contract_status, payment_status, prospect_id, seller_id, guide_id, subtotal, discount_percent, discount_fixed, tax_percent, total, notes, valid_until, num_people, num_days, start_date, end_date, language, atmos_service, slug, payment_terms FROM jsonb_populate_record(v_current, p_proposal)) WHERE id = v_id;
  END IF;
  -- Upsert stable IDs; update only editor-owned fields. Public observations, flags and metadata survive.
  v_ids := '{}'::uuid[];
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_item := NULL;
    SELECT * INTO v_item FROM public.proposal_day_items WHERE proposal_id = v_id AND id = (v_row->>'id')::uuid;
    v_child_id := coalesce(v_item.id, (v_row->>'id')::uuid, gen_random_uuid());
    IF EXISTS(SELECT 1 FROM public.proposal_day_items WHERE id = v_child_id AND proposal_id <> v_id) THEN
      RAISE EXCEPTION 'Child belongs to another proposal';
    END IF;
    IF v_child_id = ANY(v_ids) THEN RAISE EXCEPTION 'Duplicate child ID'; END IF;
    INSERT INTO public.proposal_day_items(id, proposal_id, day_number, day_label, category, item_name, value, value_text, description, catalog_item_id, variation_id, item_index, vehicle_type, quantity, cost_price, commission_percent, supplier_id, start_time, end_time)
      SELECT v_child_id, v_id, x.day_number, x.day_label, x.category, x.item_name, x.value, x.value_text, x.description, x.catalog_item_id, x.variation_id, x.item_index, x.vehicle_type, x.quantity, x.cost_price, x.commission_percent, x.supplier_id, x.start_time, x.end_time
      FROM jsonb_populate_record(v_item, v_row) x
      WHERE true
      ON CONFLICT(id) DO UPDATE SET day_number = EXCLUDED.day_number, day_label = EXCLUDED.day_label, category = EXCLUDED.category, item_name = EXCLUDED.item_name, value = EXCLUDED.value, value_text = EXCLUDED.value_text, description = EXCLUDED.description, catalog_item_id = EXCLUDED.catalog_item_id, variation_id = EXCLUDED.variation_id, item_index = EXCLUDED.item_index, vehicle_type = EXCLUDED.vehicle_type, quantity = EXCLUDED.quantity, cost_price = EXCLUDED.cost_price, commission_percent = EXCLUDED.commission_percent, supplier_id = EXCLUDED.supplier_id, start_time = EXCLUDED.start_time, end_time = EXCLUDED.end_time;
    v_ids := array_append(v_ids, v_child_id);
  END LOOP;
  DELETE FROM public.proposal_day_items WHERE proposal_id = v_id AND NOT(id = ANY(v_ids));
  v_ids := '{}'::uuid[];
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_costs) LOOP
    v_cost := NULL;
    SELECT * INTO v_cost FROM public.proposal_costs WHERE proposal_id = v_id AND id = (v_row->>'id')::uuid;
    v_child_id := coalesce(v_cost.id, (v_row->>'id')::uuid, gen_random_uuid());
    IF EXISTS(SELECT 1 FROM public.proposal_costs WHERE id = v_child_id AND proposal_id <> v_id) THEN
      RAISE EXCEPTION 'Child belongs to another proposal';
    END IF;
    IF v_child_id = ANY(v_ids) THEN RAISE EXCEPTION 'Duplicate child ID'; END IF;
    INSERT INTO public.proposal_costs(id, proposal_id, description, amount, account_id)
      SELECT v_child_id, v_id, x.description, x.amount, x.account_id
      FROM jsonb_populate_record(v_cost, v_row) x
      WHERE true
      ON CONFLICT(id) DO UPDATE SET description = EXCLUDED.description, amount = EXCLUDED.amount, account_id = EXCLUDED.account_id;
    v_ids := array_append(v_ids, v_child_id);
  END LOOP;
  DELETE FROM public.proposal_costs WHERE proposal_id = v_id AND NOT(id = ANY(v_ids));
  v_ids := '{}'::uuid[];
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_days) LOOP
    v_day := NULL;
    SELECT * INTO v_day FROM public.proposal_days WHERE proposal_id = v_id AND day_number = (v_row->>'day_number')::integer;
    v_child_id := coalesce(v_day.id, (v_row->>'id')::uuid, gen_random_uuid());
    IF EXISTS(SELECT 1 FROM public.proposal_days WHERE id = v_child_id AND proposal_id <> v_id) THEN
      RAISE EXCEPTION 'Child belongs to another proposal';
    END IF;
    IF v_child_id = ANY(v_ids) THEN RAISE EXCEPTION 'Duplicate child ID'; END IF;
    INSERT INTO public.proposal_days(id, proposal_id, day_number, description)
      SELECT v_child_id, v_id, x.day_number, x.description
      FROM jsonb_populate_record(v_day, v_row) x
      WHERE true
      ON CONFLICT(id) DO UPDATE SET day_number = EXCLUDED.day_number, description = EXCLUDED.description;
    v_ids := array_append(v_ids, v_child_id);
  END LOOP;
  DELETE FROM public.proposal_days WHERE proposal_id = v_id AND NOT(id = ANY(v_ids));
  v_ids := '{}'::uuid[];
  FOR v_row IN SELECT value FROM jsonb_array_elements(p_accommodations) LOOP
    v_acc := NULL;
    SELECT * INTO v_acc FROM public.proposal_accommodations WHERE proposal_id = v_id AND id = (v_row->>'id')::uuid;
    v_child_id := coalesce(v_acc.id, (v_row->>'id')::uuid, gen_random_uuid());
    IF EXISTS(SELECT 1 FROM public.proposal_accommodations WHERE id = v_child_id AND proposal_id <> v_id) THEN
      RAISE EXCEPTION 'Child belongs to another proposal';
    END IF;
    IF v_child_id = ANY(v_ids) THEN RAISE EXCEPTION 'Duplicate child ID'; END IF;
    INSERT INTO public.proposal_accommodations(id, proposal_id, product_id, checkin_date, checkout_date, num_nights, notes, is_selected, payment_type, rooms)
      SELECT v_child_id, v_id, x.product_id, x.checkin_date, x.checkout_date, x.num_nights, x.notes, x.is_selected, x.payment_type, x.rooms
      FROM jsonb_populate_record(v_acc, v_row) x
      WHERE true
      ON CONFLICT(id) DO UPDATE SET product_id = EXCLUDED.product_id, checkin_date = EXCLUDED.checkin_date, checkout_date = EXCLUDED.checkout_date, num_nights = EXCLUDED.num_nights, notes = EXCLUDED.notes, is_selected = EXCLUDED.is_selected, payment_type = EXCLUDED.payment_type, rooms = EXCLUDED.rooms;
    v_ids := array_append(v_ids, v_child_id);
  END LOOP;
  DELETE FROM public.proposal_accommodations WHERE proposal_id = v_id AND NOT(id = ANY(v_ids));

  -- A textual legacy description is not a reliable origin key. Leave these records intact,
  -- skip automatic commission synchronization, and report the need for manual mapping.
  SELECT EXISTS(SELECT 1 FROM public.financial_transactions
    WHERE proposal_id = v_id AND source_key IS NULL AND description LIKE 'Comissão hospedagem:%') INTO v_legacy;
  IF NOT v_legacy THEN
    FOR v_tx IN SELECT * FROM public.financial_transactions
      WHERE proposal_id = v_id AND source_key LIKE 'accommodation:%' FOR UPDATE
    LOOP
      SELECT value INTO v_comm FROM jsonb_array_elements(p_commissions) WHERE value->>'source_key' = v_tx.source_key;
      IF v_tx.status = 'cancelled' AND v_comm IS NULL THEN CONTINUE; END IF;
      IF v_tx.status NOT IN ('pending', 'overdue') THEN
        IF v_comm IS NULL OR (v_comm->>'amount')::numeric IS DISTINCT FROM v_tx.amount THEN
          RAISE EXCEPTION 'Comissão liquidada/cancelada exige ajuste manual antes de alterar a proposta';
        END IF;
      ELSIF v_comm IS NULL THEN
        UPDATE public.financial_transactions SET status = 'cancelled' WHERE id = v_tx.id;
      ELSE
        UPDATE public.financial_transactions SET amount = (v_comm->>'amount')::numeric,
          due_date = (v_comm->>'due_date')::date, description = v_comm->>'description'
          WHERE id = v_tx.id;
      END IF;
    END LOOP;
    FOR v_comm IN SELECT value FROM jsonb_array_elements(p_commissions) LOOP
      IF (v_comm->>'amount')::numeric <= 0 OR v_comm->>'source_key' NOT LIKE 'accommodation:%' THEN
        RAISE EXCEPTION 'Invalid commission';
      END IF;
      IF NOT EXISTS(SELECT 1 FROM public.financial_transactions WHERE proposal_id = v_id AND source_key = v_comm->>'source_key') THEN
        INSERT INTO public.financial_transactions(type, description, amount, due_date, proposal_id, prospect_id, status, source_key)
          VALUES ('receivable', v_comm->>'description', (v_comm->>'amount')::numeric,
            (v_comm->>'due_date')::date, v_id, (p_proposal->>'prospect_id')::uuid, 'pending', v_comm->>'source_key');
      END IF;
    END LOOP;
  END IF;

  -- Preserve the editor's existing related-record synchronization in this transaction.
  IF p_proposal->>'prospect_id' IS NOT NULL THEN
    SELECT * INTO v_prospect FROM public.prospects WHERE id = (p_proposal->>'prospect_id')::uuid;
    v_name := substring(p_proposal->>'title' from '^Proposta\s*[—–-]\s*(.+)$');
    IF v_name IS NOT NULL THEN UPDATE public.prospects SET name = btrim(v_name) WHERE id = v_prospect.id; END IF;
    IF v_prospect.email IS NOT NULL THEN
      IF v_prospect.segment = 'b2c' THEN
        UPDATE public.quote_requests SET answers = coalesce(answers, '{}'::jsonb) || jsonb_build_object(
          'groupSize', p_proposal->>'num_people', 'numDays', p_proposal->>'num_days',
          'startDate', coalesce(p_proposal->>'start_date', answers->>'startDate', ''),
          'endDate', coalesce(p_proposal->>'end_date', answers->>'endDate', ''))
          WHERE id = (SELECT id FROM public.quote_requests WHERE user_email = v_prospect.email ORDER BY created_at DESC LIMIT 1);
      ELSE
        UPDATE public.imersao_leads SET num_participantes = p_proposal->>'num_people',
          data_especifica = (p_proposal->>'start_date')::date, data_especifica_fim = (p_proposal->>'end_date')::date
          WHERE id = (SELECT id FROM public.imersao_leads WHERE email = v_prospect.email ORDER BY created_at DESC LIMIT 1);
      END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object('id', v_id, 'legacy_commissions', v_legacy);
END;
$$;
REVOKE ALL ON FUNCTION public.save_proposal_bundle(uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_proposal_bundle(uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) TO authenticated;
