-- Administrative edits made from the visual proposal page. SQL NOT EXECUTED locally.
BEGIN;
CREATE OR REPLACE FUNCTION public.save_public_proposal_edits(
  p_proposal_id uuid, p_days jsonb, p_items jsonb
) RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = pg_catalog, public AS $$
DECLARE d jsonb; i jsonb; day_num integer; item_id uuid; seen_ids uuid[] := '{}'; seen_days integer[] := '{}';
BEGIN
  IF public.has_role(auth.uid(), 'admin'::public.app_role) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Acesso administrativo necessário' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_days) IS DISTINCT FROM 'array' OR jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Dados de edição inválidos';
  END IF;
  PERFORM 1 FROM public.proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Proposta não encontrada' USING ERRCODE = 'P0002'; END IF;

  -- Verified costs are currently associated with day/position, not item UUID.
  -- Do not move that association silently from the visual editor.
  IF EXISTS (SELECT 1 FROM public.proposal_cost_checks WHERE proposal_id=p_proposal_id AND is_verified)
    AND EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_items) edit
      JOIN public.proposal_day_items old_item ON old_item.id=(edit->>'id')::uuid AND old_item.proposal_id=p_proposal_id
      WHERE old_item.item_index IS DISTINCT FROM (edit->>'item_index')::integer
    ) THEN
    RAISE EXCEPTION 'Antes de reorganizar, desmarque a conferência de custos no editor administrativo e confira os custos novamente após a alteração.';
  END IF;

  FOR d IN SELECT value FROM jsonb_array_elements(p_days) LOOP
    IF jsonb_typeof(d) IS DISTINCT FROM 'object'
      OR jsonb_typeof(d->'day_number') IS DISTINCT FROM 'number'
      OR jsonb_typeof(d->'observation') IS DISTINCT FROM 'string'
      OR jsonb_typeof(d->'day_label') IS DISTINCT FROM 'string' THEN
      RAISE EXCEPTION 'Dia inválido';
    END IF;
    IF (d->>'day_number')::numeric < 1 OR (d->>'day_number')::numeric <> trunc((d->>'day_number')::numeric) THEN
      RAISE EXCEPTION 'Número do dia inválido';
    END IF;
    day_num := (d->>'day_number')::integer;
    IF day_num = ANY(seen_days) THEN RAISE EXCEPTION 'Dia duplicado'; END IF;
    seen_days := array_append(seen_days, day_num);
    -- Clear only the observation. Never delete a day or overwrite its description/identity.
    INSERT INTO public.proposal_days(proposal_id, day_number, observation)
      VALUES(p_proposal_id, day_num, d->>'observation')
      ON CONFLICT (proposal_id,day_number) DO UPDATE SET observation = EXCLUDED.observation;
    UPDATE public.proposal_day_items SET day_label = d->>'day_label'
      WHERE proposal_id = p_proposal_id AND day_number = day_num;
  END LOOP;

  FOR i IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    IF jsonb_typeof(i) IS DISTINCT FROM 'object'
      OR jsonb_typeof(i->'id') IS DISTINCT FROM 'string'
      OR jsonb_typeof(i->'item_index') IS DISTINCT FROM 'number'
      OR NOT (i ? 'description')
      OR jsonb_typeof(i->'description') NOT IN ('string','null') THEN
      RAISE EXCEPTION 'Item inválido';
    END IF;
    IF (i->>'item_index')::numeric < 0 OR (i->>'item_index')::numeric <> trunc((i->>'item_index')::numeric) THEN
      RAISE EXCEPTION 'Ordem do item inválida';
    END IF;
    item_id := (i->>'id')::uuid;
    IF item_id = ANY(seen_ids) THEN RAISE EXCEPTION 'Item duplicado'; END IF;
    seen_ids := array_append(seen_ids, item_id);
    UPDATE public.proposal_day_items
      SET description = i->>'description', item_index = (i->>'item_index')::integer
      WHERE proposal_id = p_proposal_id AND id = item_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Item ausente ou de outra proposta' USING ERRCODE = 'P0002'; END IF;
  END LOOP;
  IF EXISTS (
    SELECT 1 FROM public.proposal_day_items WHERE proposal_id=p_proposal_id
    GROUP BY day_number,item_index HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Dois itens não podem ocupar a mesma posição no dia. Recarregue e revise a ordem.' USING ERRCODE='23505';
  END IF;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.save_public_proposal_edits(uuid,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_public_proposal_edits(uuid,jsonb,jsonb) TO authenticated;
COMMIT;
