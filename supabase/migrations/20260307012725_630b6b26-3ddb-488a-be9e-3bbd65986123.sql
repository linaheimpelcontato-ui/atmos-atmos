
-- 1. pipeline_stages
CREATE TABLE public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  position int NOT NULL DEFAULT 0,
  segment text NOT NULL CHECK (segment IN ('b2c', 'b2b')),
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage pipeline_stages" ON public.pipeline_stages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. prospects
CREATE TABLE public.prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment text NOT NULL CHECK (segment IN ('b2c', 'b2b')),
  stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  name text NOT NULL,
  email text,
  phone text,
  company_name text,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('site', 'whatsapp', 'manychat', 'manual', 'import')),
  tags text[] NOT NULL DEFAULT '{}',
  notes text,
  next_followup_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage prospects" ON public.prospects
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER set_prospects_updated_at
  BEFORE UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. prospect_interactions
CREATE TABLE public.prospect_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES public.prospects(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('note', 'call', 'email', 'whatsapp', 'stage_change', 'meeting')),
  content text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.prospect_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage prospect_interactions" ON public.prospect_interactions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Seed B2C stages
INSERT INTO public.pipeline_stages (name, position, segment, color) VALUES
  ('Lead recebido', 0, 'b2c', '#6366f1'),
  ('Qualificação', 1, 'b2c', '#f59e0b'),
  ('Proposta enviada', 2, 'b2c', '#3b82f6'),
  ('Negociação', 3, 'b2c', '#8b5cf6'),
  ('Fechado ganho', 4, 'b2c', '#22c55e'),
  ('Pós-experiência', 5, 'b2c', '#14b8a6');

-- 5. Seed B2B stages
INSERT INTO public.pipeline_stages (name, position, segment, color) VALUES
  ('Lead recebido', 0, 'b2b', '#6366f1'),
  ('Qualificação', 1, 'b2b', '#f59e0b'),
  ('Reunião agendada', 2, 'b2b', '#ec4899'),
  ('Proposta enviada', 3, 'b2b', '#3b82f6'),
  ('Negociação', 4, 'b2b', '#8b5cf6'),
  ('Fechado ganho', 5, 'b2b', '#22c55e'),
  ('Pós-venda', 6, 'b2b', '#14b8a6');
