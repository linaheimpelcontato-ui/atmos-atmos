
CREATE OR REPLACE FUNCTION public.auto_create_prospect_from_quote()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_stage_id uuid;
  v_existing_id uuid;
BEGIN
  IF NEW.user_email IS NOT NULL AND NEW.user_email <> '' THEN
    SELECT id INTO v_existing_id FROM public.prospects WHERE email = NEW.user_email LIMIT 1;
  END IF;

  IF v_existing_id IS NULL AND NEW.user_phone IS NOT NULL AND NEW.user_phone <> '' THEN
    SELECT id INTO v_existing_id FROM public.prospects WHERE phone = NEW.user_phone LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.auto_create_prospect_from_imersao()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_stage_id uuid;
  v_existing_id uuid;
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
    SELECT id INTO v_existing_id FROM public.prospects WHERE email = NEW.email LIMIT 1;
  END IF;

  IF v_existing_id IS NULL AND NEW.telefone IS NOT NULL AND NEW.telefone <> '' THEN
    SELECT id INTO v_existing_id FROM public.prospects WHERE phone = NEW.telefone LIMIT 1;
  END IF;

  IF v_existing_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

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
$function$;
