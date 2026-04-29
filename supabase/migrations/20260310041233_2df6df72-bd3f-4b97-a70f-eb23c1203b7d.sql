
CREATE TABLE public.proposal_cost_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  item_index integer NOT NULL,
  catalog_cost numeric NOT NULL DEFAULT 0,
  proposal_cost numeric NOT NULL DEFAULT 0,
  actual_cost numeric NOT NULL DEFAULT 0,
  is_verified boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, day_number, item_index)
);

ALTER TABLE public.proposal_cost_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage proposal_cost_checks"
  ON public.proposal_cost_checks FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
