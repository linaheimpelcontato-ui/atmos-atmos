-- Server module boundary. Existing non-admin customer/guide/public policies remain authoritative.
-- Legacy unknown module values (including ['all']) are NOT promoted to full access.
BEGIN;
ALTER TABLE public.admin_permissions ADD CONSTRAINT admin_permissions_known_modules
 CHECK (array_ndims(allowed_modules) IS NULL OR (array_ndims(allowed_modules)=1
   AND array_position(allowed_modules,NULL) IS NULL
   AND allowed_modules <@ ARRAY['site','cadastros','b2c','b2b','financeiro','ferramentas','configuracoes']::text[])) NOT VALID;

CREATE FUNCTION public.has_admin_module(p_module text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(public.has_role(auth.uid(),'admin') AND
   (public.is_full_admin(auth.uid()) OR EXISTS (
     SELECT 1 FROM public.admin_permissions WHERE user_id=auth.uid()
       AND allowed_modules <@ ARRAY['site','cadastros','b2c','b2b','financeiro','ferramentas','configuracoes']::text[]
       AND array_position(allowed_modules,NULL) IS NULL AND p_module=ANY(allowed_modules))),false);
$$;
-- Segment values are commercial identifiers, never arbitrary module names.
CREATE FUNCTION public.has_admin_segment(p_segment text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(public.is_full_admin(auth.uid()) OR (p_segment IN ('b2c','b2b') AND public.has_admin_module(p_segment)),false);
$$;
REVOKE ALL ON FUNCTION public.has_admin_segment(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_admin_segment(text) TO authenticated,service_role;
CREATE FUNCTION public.admin_can_access_proposal(p_id uuid, p_write boolean DEFAULT false) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.proposals WHERE id=p_id AND
  (public.is_full_admin(auth.uid()) OR public.has_admin_segment(segment)
    OR (NOT p_write AND public.has_admin_module('financeiro'))));
$$;
CREATE FUNCTION public.admin_can_access_prospect(p_id uuid, p_write boolean DEFAULT false) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS (SELECT 1 FROM public.prospects WHERE id=p_id AND
  (public.is_full_admin(auth.uid()) OR public.has_admin_module('cadastros') OR public.has_admin_segment(segment)
    OR (NOT p_write AND public.has_admin_module('financeiro'))));
$$;

-- One restrictive policy per operation intersects every permissive policy (including drift).
-- It only restricts admin sessions. Real customer/guide sessions still use existing RLS.
CREATE FUNCTION public.admin_module_row_access(p_table text, r jsonb, p_write boolean)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE seg text := r->>'segment'; pid uuid := nullif(r->>'proposal_id','')::uuid;
 cid uuid := nullif(r->>'prospect_id','')::uuid;
 commercial boolean := public.has_admin_module('b2c') OR public.has_admin_module('b2b');
 catalogue boolean := commercial OR public.has_admin_module('cadastros') OR public.has_admin_module('financeiro');
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RETURN true; END IF;
 IF public.is_full_admin(auth.uid()) THEN RETURN true; END IF;
 CASE
 WHEN p_table IN ('admin_permissions','user_roles') THEN RETURN true; -- migration17 remains stricter
 WHEN p_table='map_points' THEN RETURN public.has_admin_module('site') OR (NOT p_write AND coalesce((r->>'is_active')::boolean,false));
 WHEN p_table IN ('site_overrides','site_text_overrides','image_focal_points') THEN
   RETURN NOT p_write OR public.has_admin_module('site'); -- already public data
 WHEN p_table IN ('products','guides','guide_waterfall_prices','sellers','suppliers') THEN
   RETURN public.has_admin_module('cadastros') OR (NOT p_write AND catalogue);
 WHEN p_table IN ('default_prices','catalog_items') THEN
   RETURN public.has_admin_module('cadastros') OR (NOT p_write AND catalogue);
 WHEN p_table IN ('bank_accounts','branches','financial_transactions') THEN RETURN public.has_admin_module('financeiro');
 WHEN p_table='chart_of_accounts' THEN RETURN public.has_admin_module('financeiro') OR (NOT p_write AND catalogue);
 WHEN p_table='proposals' THEN
   RETURN (public.has_admin_segment(seg) OR (NOT p_write AND public.has_admin_module('financeiro')))
     AND (NOT p_write OR cid IS NULL OR EXISTS(SELECT 1 FROM public.prospects WHERE id=cid AND segment=seg));
 WHEN p_table='prospects' THEN
   RETURN public.has_admin_module('cadastros') OR public.has_admin_segment(seg)
     OR (NOT p_write AND public.has_admin_module('financeiro'));
 WHEN p_table IN ('contacts','prospect_interactions') THEN RETURN public.admin_can_access_prospect(cid,p_write);
 WHEN p_table IN ('proposal_items','proposal_day_items','proposal_days','proposal_accommodations','proposal_costs','proposal_feedback') THEN
   RETURN public.admin_can_access_proposal(pid,p_write);
 WHEN p_table IN ('proposal_cost_checks','proposal_cost_check_history') THEN
   RETURN CASE WHEN p_write THEN public.has_admin_module('financeiro') ELSE public.admin_can_access_proposal(pid,false) END;
 WHEN p_table='guide_trip_costs' THEN RETURN public.has_admin_module('financeiro');
 WHEN p_table='quote_requests' THEN RETURN public.has_admin_module('b2c');
 WHEN p_table='imersao_leads' THEN RETURN public.has_admin_module('b2b');
 WHEN p_table='pipeline_stages' THEN RETURN public.has_admin_segment(seg)
   OR (NOT p_write AND (public.has_admin_module('cadastros') OR public.has_admin_module('financeiro')));
 WHEN p_table='email_templates' THEN RETURN public.has_admin_segment(seg);
 WHEN p_table='sales_goals' THEN RETURN public.has_admin_module('ferramentas') OR (NOT p_write AND public.has_admin_segment(seg));
 WHEN p_table='calendar_events' THEN
   RETURN (public.has_admin_segment(seg) OR public.has_admin_module('ferramentas'))
     AND (pid IS NULL OR public.admin_can_access_proposal(pid,p_write))
     AND (cid IS NULL OR public.admin_can_access_prospect(cid,p_write));
 WHEN p_table='itinerary_checklist' THEN RETURN public.has_admin_module('ferramentas') AND public.admin_can_access_proposal(pid,false);
 WHEN p_table='profiles' THEN RETURN (r->>'id')::uuid=auth.uid() OR (NOT p_write AND public.has_admin_module('cadastros'));
 WHEN p_table='wishlist_items' THEN RETURN (r->>'user_id')::uuid=auth.uid();
 ELSE RETURN false; -- new/unmapped internal tables default to full-admin only
 END CASE;
END $$;
REVOKE ALL ON FUNCTION public.has_admin_module(text), public.admin_can_access_proposal(uuid,boolean),
 public.admin_can_access_prospect(uuid,boolean),public.admin_module_row_access(text,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_admin_module(text),public.admin_can_access_proposal(uuid,boolean),
 public.admin_can_access_prospect(uuid,boolean),public.admin_module_row_access(text,jsonb,boolean) TO authenticated,service_role;

-- RLS is bypassed by FK cascades and SECURITY DEFINER triggers/functions.
-- This trigger checks the JWT principal even inside those privileged call chains;
-- service-role/SQL maintenance and non-admin public/customer/guide paths are unchanged.
CREATE FUNCTION public.enforce_admin_module_write() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF current_setting('role',true)='authenticated' AND public.has_role(auth.uid(),'admin') THEN
  IF NOT public.is_full_admin(auth.uid()) THEN
   -- Assigning a login delegates portal access, it is not merely catalogue editing.
   IF TG_TABLE_NAME='guides' AND TG_OP <> 'DELETE'
     AND ((TG_OP='INSERT' AND (to_jsonb(NEW)->>'user_id') IS NOT NULL)
       OR (TG_OP='UPDATE' AND (to_jsonb(OLD)->>'user_id') IS DISTINCT FROM (to_jsonb(NEW)->>'user_id'))) THEN
    RAISE EXCEPTION 'Vincular uma conta de guia exige administrador total' USING ERRCODE='42501';
   END IF;
   -- Changing the customer's identity must not delegate another segment's proposal.
   IF TG_TABLE_NAME='prospects' AND TG_OP='UPDATE'
     AND (to_jsonb(OLD)->>'email') IS DISTINCT FROM (to_jsonb(NEW)->>'email')
     AND EXISTS(SELECT 1 FROM public.proposals WHERE prospect_id=(to_jsonb(OLD)->>'id')::uuid
       AND NOT public.admin_can_access_proposal(id,true)) THEN
    RAISE EXCEPTION 'Alterar o email exige acesso às propostas vinculadas' USING ERRCODE='42501';
   END IF;
  END IF;
  -- A validated FK cascade runs after the authorized parent row was deleted.
  -- Its commercial children inherit that DELETE authorization. Financial children
  -- deliberately do not: they still require finance below.
  IF TG_OP='DELETE' THEN
   IF TG_TABLE_NAME IN ('proposal_items','proposal_day_items','proposal_days','proposal_accommodations','proposal_costs','proposal_feedback','itinerary_checklist')
     AND (to_jsonb(OLD)->>'proposal_id') IS NOT NULL
     AND NOT EXISTS(SELECT 1 FROM public.proposals WHERE id=(to_jsonb(OLD)->>'proposal_id')::uuid) THEN RETURN OLD; END IF;
   IF TG_TABLE_NAME IN ('contacts','prospect_interactions')
     AND (to_jsonb(OLD)->>'prospect_id') IS NOT NULL
     AND NOT EXISTS(SELECT 1 FROM public.prospects WHERE id=(to_jsonb(OLD)->>'prospect_id')::uuid) THEN RETURN OLD; END IF;
  END IF;
  IF TG_OP <> 'INSERT' AND public.admin_module_row_access(TG_TABLE_NAME,to_jsonb(OLD),true) IS DISTINCT FROM true THEN
   RAISE EXCEPTION 'Mutação fora dos módulos autorizados: %',TG_TABLE_NAME USING ERRCODE='42501';
  END IF;
  IF TG_OP <> 'DELETE' AND public.admin_module_row_access(TG_TABLE_NAME,to_jsonb(NEW),true) IS DISTINCT FROM true THEN
   RAISE EXCEPTION 'Mutação fora dos módulos autorizados: %',TG_TABLE_NAME USING ERRCODE='42501';
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
REVOKE ALL ON FUNCTION public.enforce_admin_module_write() FROM PUBLIC,anon,authenticated;

DO $$ DECLARE t record; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public'
   AND tablename NOT IN ('admin_permissions','user_roles','admin_team_write_lock') LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t.tablename);
  EXECUTE format('CREATE POLICY module_read ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (public.admin_module_row_access(%L,to_jsonb(%I),false))',t.tablename,t.tablename,t.tablename);
  EXECUTE format('CREATE POLICY module_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.admin_module_row_access(%L,to_jsonb(%I),true))',t.tablename,t.tablename,t.tablename);
  EXECUTE format('CREATE POLICY module_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.admin_module_row_access(%L,to_jsonb(%I),true)) WITH CHECK (public.admin_module_row_access(%L,to_jsonb(%I),true))',t.tablename,t.tablename,t.tablename,t.tablename,t.tablename);
  EXECUTE format('CREATE POLICY module_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.admin_module_row_access(%L,to_jsonb(%I),true))',t.tablename,t.tablename,t.tablename);
  EXECUTE format('CREATE TRIGGER enforce_admin_module_write BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.enforce_admin_module_write()',t.tablename);
  EXECUTE format('REVOKE TRUNCATE,TRIGGER,REFERENCES ON public.%I FROM authenticated,anon',t.tablename);
 END LOOP;
END $$;

-- The commercial bundle stays SECURITY INVOKER. Never upgrade arbitrary financial
-- input into privileged writes. Commission synchronization additionally requires finance.
CREATE FUNCTION public.require_admin_bundle_access(p_id uuid,p_proposal jsonb,p_commissions jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_segment text; new_segment text;
BEGIN
 IF p_id IS NOT NULL THEN
  SELECT segment INTO old_segment FROM public.proposals WHERE id=p_id FOR UPDATE;
  IF NOT FOUND OR NOT public.has_admin_segment(old_segment) THEN RAISE EXCEPTION 'Sem acesso ao segmento da proposta' USING ERRCODE='42501'; END IF;
 END IF;
 new_segment:=coalesce(p_proposal->>'segment',old_segment,'b2c');
 IF NOT public.has_admin_segment(new_segment) THEN RAISE EXCEPTION 'Sem acesso ao segmento da proposta' USING ERRCODE='42501'; END IF;
 IF NOT public.has_admin_module('financeiro') AND
   (coalesce(jsonb_array_length(p_commissions),0)>0 OR EXISTS (
     SELECT 1 FROM public.financial_transactions WHERE proposal_id=p_id
       AND (source_key LIKE 'accommodation:%' OR (source_key IS NULL AND description LIKE 'Comissão hospedagem:%')))) THEN
  RAISE EXCEPTION 'Sincronizar comissões da proposta exige também o módulo financeiro' USING ERRCODE='42501';
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.require_admin_bundle_access(uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.require_admin_bundle_access(uuid,jsonb,jsonb) TO authenticated;

-- Decorate the current bodies without duplicating or replacing financial logic from21/22.
-- Explicit preconditions fail the migration if a prior definition changed unexpectedly.
DO $$ DECLARE def text; sig text; guard text; BEGIN
 FOR sig,guard IN SELECT * FROM (VALUES
 ('public.save_proposal_bundle(uuid,jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)',
  'PERFORM public.require_admin_bundle_access(p_id,p_proposal,p_commissions);'),
 ('public.save_public_proposal_edits(uuid,jsonb,jsonb)',
  'IF NOT public.admin_can_access_proposal(p_proposal_id,true) THEN RAISE EXCEPTION ''Sem acesso à proposta'' USING ERRCODE=''42501''; END IF;'),
 ('public.save_proposal_cost_checks(uuid,jsonb,jsonb)',
  'IF NOT public.has_admin_module(''financeiro'') THEN RAISE EXCEPTION ''Módulo financeiro necessário'' USING ERRCODE=''42501''; END IF;'),
 ('public.generate_proposal_receivable(uuid)',
  'IF NOT public.has_admin_module(''financeiro'') THEN RAISE EXCEPTION ''Módulo financeiro necessário'' USING ERRCODE=''42501''; END IF;'),
 ('public.get_guide_portal_context(uuid)',
  'IF p_preview_guide_id IS NOT NULL AND NOT public.has_admin_module(''cadastros'') THEN RAISE EXCEPTION ''Prévia exige cadastros'' USING ERRCODE=''42501''; END IF;')
 ) x(s,g) LOOP
  def:=pg_get_functiondef(sig::regprocedure);
  IF strpos(def,E'BEGIN\n')=0 THEN RAISE EXCEPTION 'Unexpected function body: %',sig; END IF;
  def:=overlay(def placing E'BEGIN\n  '||guard||E'\n' from strpos(def,E'BEGIN\n') for length(E'BEGIN\n'));
  EXECUTE def;
 END LOOP;
 def:=pg_get_functiondef('public.get_public_proposal(text)'::regprocedure);
 IF strpos(def,'v_is_admin := public.has_role(auth.uid(), ''admin''::app_role);')=0 THEN RAISE EXCEPTION 'Unexpected get_public_proposal body'; END IF;
 EXECUTE replace(def,'v_is_admin := public.has_role(auth.uid(), ''admin''::app_role);','v_is_admin := public.admin_can_access_proposal(v_proposal.id,false);');
 def:=pg_get_functiondef('public.get_guide_portal_proposals(uuid)'::regprocedure);
 IF strpos(def,'WHERE p.guide_id=v_id')=0 THEN RAISE EXCEPTION 'Unexpected guide proposals body'; END IF;
 EXECUTE replace(def,'WHERE p.guide_id=v_id','WHERE p.guide_id=v_id AND (NOT public.has_role(auth.uid(),''admin'') OR public.admin_can_access_proposal(p.id,false))');
END $$;

-- Public asset reads remain public; cross-module writes require site management.
-- Product/catalog media also lives in this shared bucket; cadastros alone must not
-- overwrite home/editor assets. A future scoped upload API can delegate narrower paths.
CREATE POLICY module_asset_insert ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
 WITH CHECK (bucket_id <> 'assets' OR public.has_admin_module('site'));
CREATE POLICY module_asset_update ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
 USING (bucket_id <> 'assets' OR public.has_admin_module('site'))
 WITH CHECK (bucket_id <> 'assets' OR public.has_admin_module('site'));
CREATE POLICY module_asset_delete ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
 USING (bucket_id <> 'assets' OR public.has_admin_module('site'));
COMMIT;
