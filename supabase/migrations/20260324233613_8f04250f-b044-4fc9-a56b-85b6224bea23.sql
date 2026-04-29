CREATE TABLE public.proposal_accommodations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id),
  checkin_date date,
  checkout_date date,
  num_nights integer NOT NULL DEFAULT 1,
  notes text DEFAULT '',
  is_selected boolean NOT NULL DEFAULT true,
  rooms jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.proposal_accommodations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access proposal_accommodations"
  ON public.proposal_accommodations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anon view shared proposal_accommodations"
  ON public.proposal_accommodations FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM proposals
    WHERE proposals.id = proposal_accommodations.proposal_id
      AND proposals.share_token IS NOT NULL
  ));