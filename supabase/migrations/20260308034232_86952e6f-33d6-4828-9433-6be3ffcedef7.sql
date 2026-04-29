
-- B2C: auto-create prospect from quote_requests
CREATE OR REPLACE FUNCTION public.auto_create_prospect_from_quote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stage_id uuid;
BEGIN
  SELECT id INTO v_stage_id
  FROM public.pipeline_stages
  WHERE segment = 'b2c' AND name ILIKE '%Aguardando Orçamento%'
  LIMIT 1;

  IF v_stage_id IS NULL THEN
    v_stage_id := '0cd5f8ed-9864-4d10-bd93-21c5dbcddee1';
  END IF;

  INSERT INTO public.prospects (name, email, phone, segment, source, tags, stage_id)
  VALUES (
    COALESCE(NEW.user_name, 'Lead Site'),
    NEW.user_email,
    NEW.user_phone,
    'b2c',
    'site',
    ARRAY['turista'],
    v_stage_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_prospect_from_quote
  AFTER INSERT ON public.quote_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_prospect_from_quote();

-- B2B: auto-create prospect from imersao_leads
CREATE OR REPLACE FUNCTION public.auto_create_prospect_from_imersao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_stage_id uuid;
BEGIN
  SELECT id INTO v_stage_id
  FROM public.pipeline_stages
  WHERE segment = 'b2b' AND name ILIKE '%Aguardando Orçamento%'
  LIMIT 1;

  IF v_stage_id IS NULL THEN
    v_stage_id := '31915620-6b6d-4b3d-891a-197f17603b3d';
  END IF;

  INSERT INTO public.prospects (name, email, phone, company_name, segment, source, tags, stage_id, notes)
  VALUES (
    NEW.nome,
    NEW.email,
    NEW.telefone,
    NEW.empresa,
    'b2b',
    'site',
    ARRAY['imersão'],
    v_stage_id,
    'Cargo: ' || COALESCE(NEW.cargo, '') || ' | Participantes: ' || COALESCE(NEW.num_participantes, '') || ' | Tipo: ' || COALESCE(NEW.tipo_grupo, '') || ' | Quando: ' || COALESCE(NEW.quando, '')
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_prospect_from_imersao
  AFTER INSERT ON public.imersao_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_prospect_from_imersao();
