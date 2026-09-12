-- Portal scoped by the existing verified account relationship. No guides SELECT grant/policy.
CREATE OR REPLACE FUNCTION public.get_guide_portal_context(p_preview_guide_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_admin boolean; v_id uuid; v_name text; v_count integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticação necessária' USING ERRCODE='42501'; END IF;
  v_admin := public.has_role(auth.uid(), 'admin');
  IF p_preview_guide_id IS NOT NULL THEN
    IF v_admin IS DISTINCT FROM true THEN RAISE EXCEPTION 'Prévia exclusiva para administradores' USING ERRCODE='42501'; END IF;
    SELECT id, name INTO v_id, v_name FROM public.guides WHERE id=p_preview_guide_id;
    IF v_id IS NULL THEN RAISE EXCEPTION 'Guia não encontrado'; END IF;
  ELSE
    SELECT count(*) INTO v_count FROM public.guides WHERE user_id=auth.uid();
    IF v_count > 1 THEN RAISE EXCEPTION 'Mais de um guia vinculado à conta; solicite reconciliação do cadastro'; END IF;
    SELECT id, name INTO v_id, v_name FROM public.guides WHERE user_id=auth.uid();
  END IF;
  RETURN jsonb_build_object('guide_id',v_id,'name',v_name,'is_admin',coalesce(v_admin,false),'is_preview',p_preview_guide_id IS NOT NULL);
END $$;
REVOKE ALL ON FUNCTION public.get_guide_portal_context(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_guide_portal_context(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_guide_portal_proposals(p_preview_guide_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  v_id := (public.get_guide_portal_context(p_preview_guide_id)->>'guide_id')::uuid;
  IF v_id IS NULL THEN RAISE EXCEPTION 'Conta sem vínculo de guia; administradores devem selecionar uma prévia' USING ERRCODE='42501'; END IF;
  RETURN coalesce((SELECT jsonb_agg(jsonb_build_object(
    'id',p.id,'code',p.code,'status',p.status,'start_date',p.start_date,'end_date',p.end_date,'num_people',p.num_people,
    'items',coalesce((SELECT jsonb_agg(jsonb_build_object('day_number',i.day_number,'category',i.category,
      'item_name',i.item_name,'start_time',i.start_time,'end_time',i.end_time) ORDER BY i.day_number,i.item_index,i.id)
      FROM public.proposal_day_items i WHERE i.proposal_id=p.id), '[]'::jsonb)
    ) ORDER BY p.start_date NULLS LAST,p.id) FROM public.proposals p WHERE p.guide_id=v_id
    AND p.status IN ('approved','accepted','negotiating','sent')), '[]'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.get_guide_portal_proposals(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_guide_portal_proposals(uuid) TO authenticated;

-- Existing costs policies query guides through admin-only RLS, preventing genuine guides.
-- This boolean helper exposes no catalog or proposal data and requires BOTH account and assignment.
CREATE OR REPLACE FUNCTION public.is_own_guide_assignment(p_guide_id uuid, p_proposal_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.guides g JOIN public.proposals p ON p.guide_id=g.id
    WHERE g.id=p_guide_id AND g.user_id=auth.uid() AND p.id=p_proposal_id
  );
$$;
REVOKE ALL ON FUNCTION public.is_own_guide_assignment(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_own_guide_assignment(uuid,uuid) TO authenticated;
DROP POLICY "Guides and admins can view guide trip costs" ON public.guide_trip_costs;
DROP POLICY "Guides and admins can insert guide trip costs" ON public.guide_trip_costs;
DROP POLICY "Guides and admins can update guide trip costs" ON public.guide_trip_costs;
DROP POLICY "Guides and admins can delete guide trip costs" ON public.guide_trip_costs;
CREATE POLICY "Assigned guide costs select" ON public.guide_trip_costs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.is_own_guide_assignment(guide_id,proposal_id));
CREATE POLICY "Assigned guide costs insert" ON public.guide_trip_costs FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(),'admin') OR (public.is_own_guide_assignment(guide_id,proposal_id) AND amount > 0 AND amount <= 999999999.99 AND amount=round(amount,2) AND length(trim(description)) BETWEEN 1 AND 500));
CREATE POLICY "Assigned guide costs update" ON public.guide_trip_costs FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.is_own_guide_assignment(guide_id,proposal_id))
WITH CHECK (public.has_role(auth.uid(),'admin') OR (public.is_own_guide_assignment(guide_id,proposal_id) AND amount > 0 AND amount <= 999999999.99 AND amount=round(amount,2) AND length(trim(description)) BETWEEN 1 AND 500));
CREATE POLICY "Assigned guide costs delete" ON public.guide_trip_costs FOR DELETE TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.is_own_guide_assignment(guide_id,proposal_id));
