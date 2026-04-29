
-- 1. Create proposal_feedback table
CREATE TABLE public.proposal_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'question',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.proposal_feedback ENABLE ROW LEVEL SECURITY;

-- 2. RLS: Admins full access
CREATE POLICY "Admins can manage proposal_feedback"
ON public.proposal_feedback FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. RLS: Anyone can INSERT if proposal has share_token
CREATE POLICY "Anyone can insert feedback on shared proposals"
ON public.proposal_feedback FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.proposals
    WHERE proposals.id = proposal_feedback.proposal_id
    AND proposals.share_token IS NOT NULL
  )
);

-- 4. RLS: Anyone can SELECT feedback on shared proposals
CREATE POLICY "Anyone can view feedback on shared proposals"
ON public.proposal_feedback FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.proposals
    WHERE proposals.id = proposal_feedback.proposal_id
    AND proposals.share_token IS NOT NULL
  )
);

-- 5. Trigger function: auto advance to negotiating on feedback
CREATE OR REPLACE FUNCTION public.auto_negotiate_on_feedback()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_proposal proposals%ROWTYPE;
  v_new_stage_id uuid;
  v_old_stage_name text;
  v_new_stage_name text;
BEGIN
  SELECT * INTO v_proposal FROM public.proposals WHERE id = NEW.proposal_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- Update proposal status to negotiating
  IF v_proposal.status IN ('sent', 'draft') THEN
    UPDATE public.proposals SET status = 'negotiating', updated_at = now() WHERE id = NEW.proposal_id;
  END IF;

  -- Move prospect to Negociação/Ajustes stage
  IF v_proposal.prospect_id IS NOT NULL THEN
    SELECT id, name INTO v_new_stage_id, v_new_stage_name
    FROM public.pipeline_stages
    WHERE segment = v_proposal.segment AND name ILIKE '%Negocia%'
    LIMIT 1;

    IF v_new_stage_id IS NOT NULL THEN
      SELECT ps.name INTO v_old_stage_name
      FROM public.prospects p
      LEFT JOIN public.pipeline_stages ps ON ps.id = p.stage_id
      WHERE p.id = v_proposal.prospect_id;

      UPDATE public.prospects SET stage_id = v_new_stage_id, updated_at = now()
      WHERE id = v_proposal.prospect_id;

      INSERT INTO public.prospect_interactions (prospect_id, type, content)
      VALUES (v_proposal.prospect_id, 'stage_change',
        COALESCE(v_old_stage_name, '?') || ' → ' || v_new_stage_name || ' (automático: feedback do cliente)');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_negotiate_on_feedback
AFTER INSERT ON public.proposal_feedback
FOR EACH ROW EXECUTE FUNCTION public.auto_negotiate_on_feedback();

-- 6. Update existing trigger to also set status draft→sent on publish
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

  -- CASE 1: published_at changed from NULL to a value (proposal sent)
  IF (OLD.published_at IS NULL AND NEW.published_at IS NOT NULL) THEN
    -- Auto status draft → sent
    IF NEW.status = 'draft' THEN
      NEW.status := 'sent';
    END IF;

    IF v_prospect_id IS NOT NULL THEN
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
    END IF;

  -- CASE 2: published_at changed from a value to NULL (proposal unpublished)
  ELSIF (OLD.published_at IS NOT NULL AND NEW.published_at IS NULL) THEN
    IF v_prospect_id IS NOT NULL THEN
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
  END IF;

  RETURN NEW;
END;
$$;
