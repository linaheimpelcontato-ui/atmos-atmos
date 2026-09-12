-- No backfill: a slot cannot establish historical item identity.
-- UUID deliberately retained as a tombstone after item deletion; no cascading FK/history loss.
ALTER TABLE public.proposal_cost_checks ADD COLUMN item_id uuid, ADD COLUMN identity_snapshot jsonb;
CREATE TABLE public.proposal_cost_check_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL,
  check_id uuid NOT NULL,
  previous_record jsonb NOT NULL,
  changed_by uuid NOT NULL,
  archived_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.proposal_cost_check_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read cost check history" ON public.proposal_cost_check_history FOR SELECT TO authenticated USING(public.has_role(auth.uid(),'admin'));
REVOKE ALL ON public.proposal_cost_check_history FROM anon, authenticated;
GRANT SELECT ON public.proposal_cost_check_history TO authenticated;

CREATE FUNCTION public.cost_item_identity(p_item public.proposal_day_items)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=public AS $$
 SELECT jsonb_build_object('id',p_item.id,'day_number',p_item.day_number,'item_index',p_item.item_index,
 'catalog_item_id',p_item.catalog_item_id,'variation_id',p_item.variation_id,'category',p_item.category,
 'supplier_id',p_item.supplier_id,'vehicle_type',coalesce(p_item.vehicle_type,'carroTurista'),'quantity',coalesce(p_item.quantity,1));
$$;
REVOKE ALL ON FUNCTION public.cost_item_identity(public.proposal_day_items) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cost_item_identity(public.proposal_day_items) TO authenticated;

-- Day checks can only be mutated by the owner-executed administrative RPC below.
-- Negative accommodation slots retain their existing access path, outside this day-item contract.
CREATE FUNCTION public.require_cost_check_rpc() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
 IF ((TG_OP <> 'DELETE' AND NEW.day_number >= 0) OR (TG_OP <> 'INSERT' AND OLD.day_number >= 0))
   AND current_user IS DISTINCT FROM (SELECT pg_get_userbyid(relowner) FROM pg_class WHERE oid=TG_RELID) THEN
   RAISE EXCEPTION 'Use a conferência administrativa com validação de identidade; recarregue o painel.' USING ERRCODE='42501';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER require_cost_check_rpc BEFORE INSERT OR UPDATE OR DELETE ON public.proposal_cost_checks
FOR EACH ROW EXECUTE FUNCTION public.require_cost_check_rpc();

CREATE FUNCTION public.save_proposal_cost_checks(p_proposal_id uuid, p_checks jsonb, p_release_ids jsonb DEFAULT '[]')
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r jsonb; item public.proposal_day_items; old public.proposal_cost_checks; seen uuid[] := '{}'; release_id uuid;
BEGIN
 IF auth.uid() IS NULL OR public.has_role(auth.uid(),'admin') IS DISTINCT FROM true THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_checks) IS DISTINCT FROM 'array' OR jsonb_typeof(p_release_ids) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid checks payload'; END IF;
 PERFORM 1 FROM public.proposals WHERE id=p_proposal_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada'; END IF;
 PERFORM 1 FROM public.proposal_cost_checks WHERE proposal_id=p_proposal_id FOR UPDATE;
 FOR release_id IN SELECT value::text::uuid FROM jsonb_array_elements_text(p_release_ids) LOOP
   SELECT * INTO STRICT old FROM public.proposal_cost_checks WHERE id=release_id AND proposal_id=p_proposal_id AND day_number>=0;
   INSERT INTO public.proposal_cost_check_history(proposal_id,check_id,previous_record,changed_by) VALUES(p_proposal_id,old.id,to_jsonb(old),auth.uid());
   UPDATE public.proposal_cost_checks SET is_verified=false, updated_at=now() WHERE id=old.id;
 END LOOP;
 FOR r IN SELECT value FROM jsonb_array_elements(p_checks) LOOP
   IF jsonb_typeof(r->'actual_cost') IS DISTINCT FROM 'number' OR (r->>'actual_cost')::numeric < 0
     OR jsonb_typeof(r->'is_verified') IS DISTINCT FROM 'boolean' OR jsonb_typeof(r->'expected_snapshot') IS DISTINCT FROM 'object' THEN
     RAISE EXCEPTION 'Valor, estado e identidade esperada são obrigatórios';
   END IF;
   SELECT * INTO STRICT item FROM public.proposal_day_items WHERE proposal_id=p_proposal_id AND id=(r->>'item_id')::uuid;
   IF item.id=ANY(seen) THEN RAISE EXCEPTION 'Item duplicado'; END IF;
   seen:=array_append(seen,item.id);
   IF public.cost_item_identity(item) IS DISTINCT FROM r->'expected_snapshot' THEN
     RAISE EXCEPTION 'A composição mudou desde a abertura da conferência. Salve a proposta e reabra o checklist para conferir o item correto.' USING ERRCODE='55000';
   END IF;
   IF (SELECT count(*) FROM public.proposal_day_items WHERE proposal_id=p_proposal_id AND day_number=item.day_number AND item_index=item.item_index) IS DISTINCT FROM 1 THEN
     RAISE EXCEPTION 'Posição ambígua; corrija a composição antes de conferir' USING ERRCODE='55000';
   END IF;
   SELECT * INTO old FROM public.proposal_cost_checks WHERE proposal_id=p_proposal_id AND day_number=item.day_number AND item_index=item.item_index;
   IF old.id IS NOT NULL THEN
     -- An unresolved verified check must be explicitly released, never silently rebound.
     IF old.is_verified AND (old.item_id IS DISTINCT FROM item.id OR (old.identity_snapshot-'quantity') IS DISTINCT FROM (public.cost_item_identity(item)-'quantity')) THEN
       RAISE EXCEPTION 'Desmarque a conferência antiga preservando histórico e confira novamente o item correto.' USING ERRCODE='55000';
     END IF;
     INSERT INTO public.proposal_cost_check_history(proposal_id,check_id,previous_record,changed_by) VALUES(p_proposal_id,old.id,to_jsonb(old),auth.uid());
   END IF;
   INSERT INTO public.proposal_cost_checks(proposal_id,day_number,item_index,item_id,identity_snapshot,catalog_cost,proposal_cost,actual_cost,is_verified,notes)
   VALUES(p_proposal_id,item.day_number,item.item_index,item.id,public.cost_item_identity(item),coalesce((r->>'catalog_cost')::numeric,0),coalesce((r->>'proposal_cost')::numeric,0),(r->>'actual_cost')::numeric,(r->>'is_verified')::boolean,r->>'notes')
   ON CONFLICT(proposal_id,day_number,item_index) DO UPDATE SET item_id=EXCLUDED.item_id,identity_snapshot=EXCLUDED.identity_snapshot,
     catalog_cost=EXCLUDED.catalog_cost,proposal_cost=EXCLUDED.proposal_cost,actual_cost=EXCLUDED.actual_cost,is_verified=EXCLUDED.is_verified,notes=EXCLUDED.notes,updated_at=now();
 END LOOP;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.save_proposal_cost_checks(uuid,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_proposal_cost_checks(uuid,jsonb,jsonb) TO authenticated;

-- Incremental replacement of the 813aee6 bundle; no checks/history are deleted.
CREATE OR REPLACE FUNCTION public.save_proposal_bundle(
  p_id uuid, p_proposal jsonb, p_items jsonb, p_costs jsonb,
  p_days jsonb, p_accommodations jsonb, p_commissions jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_final_items jsonb;
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
