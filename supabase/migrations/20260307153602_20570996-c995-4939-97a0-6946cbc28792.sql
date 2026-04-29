
CREATE TABLE public.imersao_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  nome text NOT NULL,
  email text NOT NULL,
  instagram_site text,
  telefone text NOT NULL,
  empresa text NOT NULL,
  cargo text NOT NULL,
  tipo_grupo text NOT NULL,
  num_participantes text NOT NULL,
  quando text NOT NULL,
  data_especifica date,
  objetivos jsonb NOT NULL DEFAULT '[]'::jsonb,
  hospedagem text,
  orcamento text,
  como_conheceu text,
  observacoes text,
  status text NOT NULL DEFAULT 'novo'
);

ALTER TABLE public.imersao_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert imersao_leads"
  ON public.imersao_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can manage imersao_leads"
  ON public.imersao_leads FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
