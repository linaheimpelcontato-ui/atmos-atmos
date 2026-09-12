-- Requests create CRM leads on the server, independently for B2B and B2C.
-- Never attach a new request to a different segment merely because email matches.
CREATE OR REPLACE FUNCTION public.sync_request_prospect()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_segment text;
  v_email text;
  v_phone text;
  v_name text;
  v_company text;
  v_stage uuid;
BEGIN
  IF TG_TABLE_NAME = 'quote_requests' THEN
    v_segment := 'b2c';
    v_email := nullif(lower(btrim(NEW.user_email)), '');
    v_phone := nullif(regexp_replace(NEW.user_phone, '[^0-9]', '', 'g'), '');
    v_name := coalesce(nullif(btrim(NEW.user_name), ''), 'Lead Site');
  ELSIF TG_TABLE_NAME = 'imersao_leads' THEN
    v_segment := 'b2b';
    v_email := nullif(lower(btrim(NEW.email)), '');
    v_phone := nullif(regexp_replace(NEW.telefone, '[^0-9]', '', 'g'), '');
    v_name := coalesce(nullif(btrim(NEW.nome), ''), 'Lead Site');
    v_company := NEW.empresa;
  ELSE
    RAISE EXCEPTION 'Unsupported request table';
  END IF;

  -- Serialize concurrent requests sharing either contact key. Always acquire
  -- email before phone. Existing CRM notes/stage/tags are never overwritten.
  IF v_email IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_segment || ':email:' || v_email, 0));
  END IF;
  IF v_phone IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(v_segment || ':phone:' || v_phone, 0));
  END IF;
  IF EXISTS (SELECT 1 FROM public.prospects p WHERE p.segment = v_segment
    AND ((v_email IS NOT NULL AND lower(btrim(p.email)) = v_email)
      OR (v_phone IS NOT NULL AND regexp_replace(p.phone, '[^0-9]', '', 'g') = v_phone))) THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_stage FROM public.pipeline_stages WHERE segment = v_segment
    ORDER BY (name ILIKE '%Aguardando Orçamento%') DESC, position, id LIMIT 1;
  -- No hard-coded stage UUID: an empty pipeline leaves an explicitly unassigned
  -- lead, rather than rolling back the customer's request with a foreign-key error.
  INSERT INTO public.prospects(name,email,phone,company_name,segment,source,tags,stage_id)
  VALUES(v_name,v_email,v_phone,v_company,v_segment,'site',
    CASE WHEN v_segment='b2c' THEN ARRAY['turista'] ELSE ARRAY['imersão'] END,v_stage);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.sync_request_prospect() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_auto_prospect_from_quote ON public.quote_requests;
CREATE TRIGGER trg_auto_prospect_from_quote AFTER INSERT ON public.quote_requests
FOR EACH ROW EXECUTE FUNCTION public.sync_request_prospect();
DROP TRIGGER IF EXISTS trg_auto_prospect_from_imersao ON public.imersao_leads;
CREATE TRIGGER trg_auto_prospect_from_imersao AFTER INSERT ON public.imersao_leads
FOR EACH ROW EXECUTE FUNCTION public.sync_request_prospect();
DROP FUNCTION IF EXISTS public.auto_create_prospect_from_quote();
DROP FUNCTION IF EXISTS public.auto_create_prospect_from_imersao();
