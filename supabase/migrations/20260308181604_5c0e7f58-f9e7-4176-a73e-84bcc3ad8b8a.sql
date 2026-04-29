
CREATE TABLE public.proposal_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (proposal_id, day_number)
);

ALTER TABLE public.proposal_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage proposal_days" ON public.proposal_days
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view shared proposal_days" ON public.proposal_days
  FOR SELECT TO anon, authenticated
  USING (EXISTS (
    SELECT 1 FROM proposals WHERE proposals.id = proposal_days.proposal_id AND proposals.share_token IS NOT NULL
  ));
