-- Monetary totals are derived from the submitted composition, never trusted
-- from a browser's subtotal/total fields. No existing proposal is repriced here.
CREATE OR REPLACE FUNCTION public.proposal_pricing_from_bundle(p jsonb, items jsonb, accommodations jsonb)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  people numeric := coalesce((p->>'num_people')::numeric,1);
  days numeric := coalesce((p->>'num_days')::numeric,1);
  courtesies numeric := coalesce((p#>>'{atmos_service,num_courtesies}')::numeric,0);
  service_price numeric := coalesce((p#>>'{atmos_service,price_per_person_day}')::numeric,0);
  dp numeric := coalesce((p->>'discount_percent')::numeric,0);
  df numeric := coalesce((p->>'discount_fixed')::numeric,0);
  tax numeric := coalesce((p->>'tax_percent')::numeric,0);
  subtotal numeric := 0;
  lodging numeric := 0;
  discount numeric;
  base numeric;
  total numeric;
  r jsonb;
  a jsonb;
  u jsonb;
  room_units jsonb;
  price numeric;
  qty numeric;
  nights numeric;
  capacity numeric;
BEGIN
  IF NOT (people > 0 AND people < 'Infinity'::numeric AND people=trunc(people)
    AND days > 0 AND days < 'Infinity'::numeric AND days=trunc(days)
    AND courtesies >= 0 AND courtesies < people AND courtesies=trunc(courtesies)) THEN
    RAISE EXCEPTION 'Informe um grupo e dias válidos com pelo menos um pagante' USING ERRCODE='22023';
  END IF;
  IF NOT (dp BETWEEN 0 AND 100 AND df >= 0 AND df < 'Infinity'::numeric
    AND tax >= 0 AND tax < 100 AND service_price >= 0 AND service_price < 'Infinity'::numeric
    AND dp=round(dp,2) AND df=round(df,2) AND tax=round(tax,2)) THEN
    RAISE EXCEPTION 'Preços, descontos ou imposto inválidos' USING ERRCODE='22023';
  END IF;
  FOR r IN SELECT value FROM jsonb_array_elements(items) LOOP
    price := (r->>'value')::numeric;
    qty := coalesce((r->>'quantity')::numeric,1);
    IF price IS NULL OR NOT (price>=0 AND price<'Infinity'::numeric AND qty>=0 AND qty<'Infinity'::numeric AND qty=trunc(qty)) THEN
      RAISE EXCEPTION 'Valor ou quantidade inválidos em item do roteiro' USING ERRCODE='22023';
    END IF;
    subtotal := subtotal + round(price*qty,2);
  END LOOP;
  FOR a IN SELECT value FROM jsonb_array_elements(accommodations) LOOP
    IF coalesce((a->>'is_selected')::boolean,false) AND a->>'payment_type'='atmos' THEN
      nights := coalesce((a->>'num_nights')::numeric,0);
      IF NOT (nights>=0 AND nights<'Infinity'::numeric AND nights=trunc(nights)) THEN
        RAISE EXCEPTION 'Número de noites inválido' USING ERRCODE='22023';
      END IF;
      room_units := a->'rooms';
      IF jsonb_typeof(room_units)='array' THEN
        IF jsonb_array_length(room_units)>0 AND room_units#>'{0,rooms}' IS NULL THEN
          room_units := jsonb_build_array(jsonb_build_object('rooms',room_units));
        END IF;
      ELSIF jsonb_typeof(room_units)='object' AND jsonb_typeof(room_units->'modalities')='array' THEN
        room_units := jsonb_build_array(jsonb_build_object('rooms',room_units->'modalities'));
      ELSE
        RAISE EXCEPTION 'Modalidades de hospedagem inválidas' USING ERRCODE='22023';
      END IF;
      FOR u IN SELECT value FROM jsonb_array_elements(room_units) LOOP
        FOR r IN SELECT value FROM jsonb_array_elements(u->'rooms') LOOP
          IF coalesce((r->>'available')::boolean,true) THEN
            price := coalesce((r->>'price')::numeric,0);
            qty := coalesce((r->>'units')::numeric,0);
            capacity := coalesce((r->>'capacity')::numeric,1);
            IF NOT (price>=0 AND price<'Infinity'::numeric AND qty>=0 AND qty<'Infinity'::numeric
              AND qty=trunc(qty) AND capacity>0 AND capacity<'Infinity'::numeric AND capacity=trunc(capacity)) THEN
              RAISE EXCEPTION 'Preço ou ocupação de hospedagem inválidos' USING ERRCODE='22023';
            END IF;
            lodging := lodging + round(price*qty*nights*CASE WHEN r->>'pricing_type'='per_person' THEN capacity ELSE 1 END,2);
          END IF;
        END LOOP;
      END LOOP;
    END IF;
  END LOOP;
  discount := round(subtotal*dp/100+df,2);
  IF discount>subtotal THEN
    RAISE EXCEPTION 'O desconto não pode exceder o subtotal dos itens do roteiro' USING ERRCODE='22023';
  END IF;
  base := round(subtotal-discount+round(service_price*people*days,2)+lodging,2);
  total := round(base/(1-tax/100),2);
  IF total>99999999.99 THEN RAISE EXCEPTION 'O total excede o limite monetário da proposta' USING ERRCODE='22023'; END IF;
  RETURN jsonb_build_object('subtotal',subtotal,'total',total,'discount_percent',dp,'discount_fixed',df,'tax_percent',tax);
END $$;
REVOKE ALL ON FUNCTION public.proposal_pricing_from_bundle(jsonb,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.proposal_pricing_from_bundle(jsonb,jsonb,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_proposal_bundle(
  p_id uuid, p_proposal jsonb, p_items jsonb, p_costs jsonb,
  p_days jsonb, p_accommodations jsonb, p_commissions jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_final_items jsonb;
  v_final_accommodations jsonb;
  v_check public.proposal_cost_checks;
  v_before public.proposal_day_items;
  v_after public.proposal_day_items;
  v_legacy boolean;
  v_tx public.financial_transactions;
  v_comm jsonb;
  v_prospect public.prospects;
  v_name text;
  v_current public.proposals;
  v_row jsonb;
  v_ids uuid[];
  v_child_ids jsonb := '{}'::jsonb;
  v_sources text[] := '{}'::text[];
  v_source text;
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
  -- Explicit boolean only. Missing means leave UPDATE unchanged / use CREATE default.
  IF p_proposal ? 'show_price_breakdown' AND jsonb_typeof(p_proposal->'show_price_breakdown') IS DISTINCT FROM 'boolean' THEN
    RAISE EXCEPTION 'show_price_breakdown must be boolean' USING ERRCODE = '22023';
  END IF;
  -- Validate before any writes and even when legacy financial rows suspend synchronization.
  FOR v_comm IN SELECT value FROM jsonb_array_elements(p_commissions) LOOP
    IF jsonb_typeof(v_comm) IS DISTINCT FROM 'object'
      OR jsonb_typeof(v_comm->'source_key') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v_comm->'amount') IS DISTINCT FROM 'number'
      OR jsonb_typeof(v_comm->'description') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v_comm->'due_date') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'Commission fields must be present and non-null' USING ERRCODE = '22023';
    END IF;
    v_source := v_comm->>'source_key';
    IF v_source !~ '^accommodation:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      OR (v_comm->>'amount')::numeric <= 0 OR btrim(v_comm->>'description') = ''
      OR (v_comm->>'due_date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' THEN
      RAISE EXCEPTION 'Invalid commission values' USING ERRCODE = '22023';
    END IF;
    PERFORM (v_comm->>'due_date')::date;
    IF v_source = ANY(v_sources) THEN
      RAISE EXCEPTION 'Duplicate commission source_key' USING ERRCODE = '22023';
    END IF;
    v_sources := array_append(v_sources, v_source);
    IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(p_accommodations) a
      WHERE (a->>'id')::uuid = substring(v_source from 15)::uuid
        AND (a->>'is_selected')::boolean IS TRUE AND a->>'payment_type' = 'hospedagem') THEN
      RAISE EXCEPTION 'Commission source must identify a selected supplier-paid accommodation in this bundle' USING ERRCODE = '22023';
    END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_accommodations) a
    CROSS JOIN LATERAL jsonb_array_elements(a->'rooms') u
    CROSS JOIN LATERAL jsonb_array_elements(u->'rooms') r
    WHERE (a->>'is_selected')::boolean AND (r->>'available')::boolean AND (r->>'units')::numeric > 0
      AND (r->>'commission_percent' IS NULL OR (r->>'commission_percent')::numeric NOT BETWEEN 0 AND 100)
  ) THEN RAISE EXCEPTION 'Confirme as comissões históricas por modalidade'; END IF;
  -- Serialize with other bundle/visual saves, then inspect the persisted identity BEFORE writes.
  IF p_id IS NOT NULL THEN
    SELECT * INTO STRICT v_current FROM public.proposals WHERE id = p_id FOR UPDATE;
    PERFORM 1 FROM public.proposal_cost_checks WHERE proposal_id=p_id FOR UPDATE;
  END IF;
  -- Resolve omitted fields exactly like the upsert below; p_items is the complete final collection.
  SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) INTO v_final_items
  FROM jsonb_array_elements(p_items) r
  LEFT JOIN public.proposal_day_items old ON old.proposal_id=p_id AND old.id=(r->>'id')::uuid
  CROSS JOIN LATERAL jsonb_populate_record(old, r) x;
  IF EXISTS(SELECT 1 FROM jsonb_to_recordset(v_final_items) AS x(day_number integer,item_index integer)
    GROUP BY day_number,item_index HAVING count(*) > 1)
    OR EXISTS(SELECT 1 FROM jsonb_to_recordset(v_final_items) AS x(day_number integer,item_index integer)
      WHERE day_number IS NULL OR item_index IS NULL) THEN
    RAISE EXCEPTION 'Dois itens ocupam o mesmo dia/posição ou possuem posição ausente. Desmarque eventuais conferências antes de corrigir a composição e confira novamente os itens corretos.' USING ERRCODE='22023';
  END IF;
  FOR v_check IN SELECT * FROM public.proposal_cost_checks
    WHERE proposal_id=p_id AND is_verified AND day_number >= 0 LOOP
    IF (SELECT count(*) FROM public.proposal_day_items WHERE proposal_id=p_id
      AND day_number=v_check.day_number AND item_index=v_check.item_index) IS DISTINCT FROM 1
      OR (SELECT count(*) FROM jsonb_populate_recordset(NULL::public.proposal_day_items,v_final_items)
        WHERE day_number=v_check.day_number AND item_index=v_check.item_index) IS DISTINCT FROM 1 THEN
      RAISE EXCEPTION 'Item com custo conferido removido, movido ou ambíguo. Desmarque a conferência antes de alterar e confira novamente o custo do item correto.' USING ERRCODE='55000';
    END IF;
    SELECT * INTO STRICT v_before FROM public.proposal_day_items WHERE proposal_id=p_id
      AND day_number=v_check.day_number AND item_index=v_check.item_index;
    SELECT * INTO STRICT v_after FROM jsonb_populate_recordset(NULL::public.proposal_day_items,v_final_items)
      WHERE day_number=v_check.day_number AND item_index=v_check.item_index;
    IF v_check.item_id IS NOT NULL AND (v_check.item_id IS DISTINCT FROM v_before.id
      OR (v_check.identity_snapshot-'quantity') IS DISTINCT FROM (public.cost_item_identity(v_before)-'quantity')) THEN
      RAISE EXCEPTION 'Conferência com identidade antiga. Desmarque preservando histórico e confira novamente.' USING ERRCODE='55000';
    END IF;
    IF ROW(v_before.id,v_before.day_number,v_before.item_index,v_before.catalog_item_id,v_before.variation_id,v_before.category,v_before.supplier_id,coalesce(v_before.vehicle_type,'carroTurista'))
      IS DISTINCT FROM ROW(v_after.id,v_after.day_number,v_after.item_index,v_after.catalog_item_id,v_after.variation_id,v_after.category,v_after.supplier_id,coalesce(v_after.vehicle_type,'carroTurista')) THEN
      RAISE EXCEPTION 'Identidade de item com custo conferido alterada. Desmarque a conferência antes de alterar e confira novamente o custo do item correto.' USING ERRCODE='55000';
    END IF;
  END LOOP;
  -- Quantity is intentionally not identity: existing unit/total pricing semantics remain unchanged.
  -- Compute from resolved snapshot fields, under the same proposal lock.
  -- Preserve omission semantics for unrelated proposal fields (including privacy).
  SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb) INTO v_final_accommodations
  FROM jsonb_array_elements(p_accommodations) r
  LEFT JOIN public.proposal_accommodations old ON old.proposal_id=p_id AND old.id=(r->>'id')::uuid
  CROSS JOIN LATERAL jsonb_populate_record(old, r) x;
  p_proposal := p_proposal || public.proposal_pricing_from_bundle(
    coalesce(to_jsonb(v_current), '{}'::jsonb) || p_proposal, v_final_items, v_final_accommodations);
  IF p_id IS NULL THEN
    INSERT INTO public.proposals (title, status, segment, contract_status, payment_status, prospect_id, seller_id, guide_id, subtotal, discount_percent, discount_fixed, tax_percent, total, notes, valid_until, num_people, num_days, start_date, end_date, language, atmos_service, slug, payment_terms)
      SELECT title, status, segment, contract_status, payment_status, prospect_id, seller_id, guide_id, subtotal, discount_percent, discount_fixed, tax_percent, total, notes, valid_until, num_people, num_days, start_date, end_date, language, atmos_service, slug, payment_terms FROM jsonb_populate_record(NULL::public.proposals, p_proposal)
      RETURNING id INTO v_id;
  ELSE
    v_id := v_current.id;
    UPDATE public.proposals SET (title, status, segment, contract_status, payment_status, prospect_id, seller_id, guide_id, subtotal, discount_percent, discount_fixed, tax_percent, total, notes, valid_until, num_people, num_days, start_date, end_date, language, atmos_service, slug, payment_terms) =
      (SELECT title, status, segment, contract_status, payment_status, prospect_id, seller_id, guide_id, subtotal, discount_percent, discount_fixed, tax_percent, total, notes, valid_until, num_people, num_days, start_date, end_date, language, atmos_service, slug, payment_terms FROM jsonb_populate_record(v_current, p_proposal)) WHERE id = v_id;
  END IF;
  IF p_proposal ? 'show_price_breakdown' THEN
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'proposals' AND column_name = 'show_price_breakdown') THEN
      RAISE EXCEPTION 'Apply the show_price_breakdown migration before saving this setting' USING ERRCODE = '42703';
    END IF;
    EXECUTE 'UPDATE public.proposals SET show_price_breakdown = $1 WHERE id = $2'
      USING (p_proposal->>'show_price_breakdown')::boolean, v_id;
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
  v_child_ids := v_child_ids || jsonb_build_object('items', to_jsonb(v_ids));
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
  v_child_ids := v_child_ids || jsonb_build_object('costs', to_jsonb(v_ids));
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
  v_child_ids := v_child_ids || jsonb_build_object('days', to_jsonb(v_ids));
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
  v_child_ids := v_child_ids || jsonb_build_object('accommodations', to_jsonb(v_ids));

  -- A cancelled origin can be a deliberate manual decision. Never silently resurrect it
  -- or report success with a desired commission still cancelled, even in legacy mode.
  PERFORM id FROM public.financial_transactions WHERE proposal_id = v_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.financial_transactions t
    JOIN jsonb_array_elements(p_commissions) c ON c->>'source_key' = t.source_key
    WHERE t.proposal_id = v_id AND t.status = 'cancelled') THEN
    RAISE EXCEPTION 'Comissão cancelada reapareceu. Reconcilie ou reabra manualmente o recebível antes de salvar a proposta.' USING ERRCODE = '55000';
  END IF;

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
  RETURN jsonb_build_object('id', v_id, 'legacy_commissions', v_legacy, 'child_ids', v_child_ids);
END;
$$;
REVOKE ALL ON FUNCTION public.save_proposal_bundle(uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_proposal_bundle(uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) TO authenticated;
