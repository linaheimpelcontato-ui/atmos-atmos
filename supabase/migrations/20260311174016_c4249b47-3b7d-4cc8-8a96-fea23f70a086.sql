
CREATE OR REPLACE FUNCTION public.auto_advance_pipeline_on_publish()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prospect_id uuid;
  v_segment text;
  v_new_stage_id uuid;
  v_old_stage_name text;
  v_new_stage_name text;
  v_has_other_published boolean;
BEGIN
  v_prospect_id := NEW.prospect_id;
  v_segment := NEW.segment;

  -- Skip if no prospect linked
  IF v_prospect_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- CASE 1: published_at changed from NULL to a value (proposal sent)
  IF (OLD.published_at IS NULL AND NEW.published_at IS NOT NULL) THEN
    SELECT id, name INTO v_new_stage_id, v_new_stage_name
    FROM public.pipeline_stages
    WHERE segment = v_segment AND name ILIKE '%Proposta Enviada%'
    LIMIT 1;

    IF v_new_stage_id IS NOT NULL THEN
      SELECT ps.name INTO v_old_stage_name
      FROM public.prospects p
      LEFT JOIN public.pipeline_stages ps ON ps.id = p.stage_id
      WHERE p.id = v_prospect_id;

      UPDATE public.prospects SET stage_id = v_new_stage_id, updated_at = now()
      WHERE id = v_prospect_id;

      INSERT INTO public.prospect_interactions (prospect_id, type, content)
      VALUES (v_prospect_id, 'stage_change',
        COALESCE(v_old_stage_name, '?') || ' → ' || v_new_stage_name || ' (automático: proposta publicada)');
    END IF;

  -- CASE 2: published_at changed from a value to NULL (proposal unpublished)
  ELSIF (OLD.published_at IS NOT NULL AND NEW.published_at IS NULL) THEN
    SELECT EXISTS (
      SELECT 1 FROM public.proposals
      WHERE prospect_id = v_prospect_id AND id <> NEW.id AND published_at IS NOT NULL
    ) INTO v_has_other_published;

    IF NOT v_has_other_published THEN
      SELECT id, name INTO v_new_stage_id, v_new_stage_name
      FROM public.pipeline_stages
      WHERE segment = v_segment AND name ILIKE '%Aguardando Orçamento%'
      LIMIT 1;

      IF v_new_stage_id IS NOT NULL THEN
        SELECT ps.name INTO v_old_stage_name
        FROM public.prospects p
        LEFT JOIN public.pipeline_stages ps ON ps.id = p.stage_id
        WHERE p.id = v_prospect_id;

        UPDATE public.prospects SET stage_id = v_new_stage_id, updated_at = now()
        WHERE id = v_prospect_id;

        INSERT INTO public.prospect_interactions (prospect_id, type, content)
        VALUES (v_prospect_id, 'stage_change',
          COALESCE(v_old_stage_name, '?') || ' → ' || v_new_stage_name || ' (automático: proposta despublicada)');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_advance_pipeline
AFTER UPDATE OF published_at ON public.proposals
FOR EACH ROW
EXECUTE FUNCTION public.auto_advance_pipeline_on_publish();
