
ALTER TABLE public.proposals ADD COLUMN published_at timestamptz DEFAULT NULL;

-- Allow authenticated users to view proposals published for them (matching prospect email)
CREATE POLICY "Authenticated can view own published proposals"
ON public.proposals
FOR SELECT
TO authenticated
USING (
  published_at IS NOT NULL
  AND prospect_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.prospects p
    WHERE p.id = proposals.prospect_id
    AND p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Allow authenticated users to view proposal_day_items for their published proposals
CREATE POLICY "Authenticated can view own published proposal_day_items"
ON public.proposal_day_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.proposals pr
    JOIN public.prospects p ON p.id = pr.prospect_id
    WHERE pr.id = proposal_day_items.proposal_id
    AND pr.published_at IS NOT NULL
    AND p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Allow authenticated users to view proposal_days for their published proposals
CREATE POLICY "Authenticated can view own published proposal_days"
ON public.proposal_days
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.proposals pr
    JOIN public.prospects p ON p.id = pr.prospect_id
    WHERE pr.id = proposal_days.proposal_id
    AND pr.published_at IS NOT NULL
    AND p.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);
