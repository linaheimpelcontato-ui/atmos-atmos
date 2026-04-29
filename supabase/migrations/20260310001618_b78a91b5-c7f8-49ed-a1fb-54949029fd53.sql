
-- ============ PROPOSALS ============
DROP POLICY IF EXISTS "Admins full access proposals" ON public.proposals;
DROP POLICY IF EXISTS "Customer view published proposals" ON public.proposals;
DROP POLICY IF EXISTS "Anon view shared proposals" ON public.proposals;

CREATE POLICY "Admins full access proposals"
ON public.proposals AS PERMISSIVE FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customer view published proposals"
ON public.proposals AS PERMISSIVE FOR SELECT TO authenticated
USING (
  published_at IS NOT NULL
  AND prospect_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.prospects p
    WHERE p.id = proposals.prospect_id
    AND p.email = auth.email()
  )
);

CREATE POLICY "Anon view shared proposals"
ON public.proposals AS PERMISSIVE FOR SELECT TO anon, authenticated
USING (share_token IS NOT NULL);

-- ============ PROPOSAL_DAYS ============
DROP POLICY IF EXISTS "Admins full access proposal_days" ON public.proposal_days;
DROP POLICY IF EXISTS "Customer view published proposal_days" ON public.proposal_days;
DROP POLICY IF EXISTS "Anon view shared proposal_days" ON public.proposal_days;

CREATE POLICY "Admins full access proposal_days"
ON public.proposal_days AS PERMISSIVE FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customer view published proposal_days"
ON public.proposal_days AS PERMISSIVE FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.proposals pr
    JOIN public.prospects p ON p.id = pr.prospect_id
    WHERE pr.id = proposal_days.proposal_id
    AND pr.published_at IS NOT NULL
    AND p.email = auth.email()
  )
);

CREATE POLICY "Anon view shared proposal_days"
ON public.proposal_days AS PERMISSIVE FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.proposals
    WHERE proposals.id = proposal_days.proposal_id
    AND proposals.share_token IS NOT NULL
  )
);

-- ============ PROPOSAL_DAY_ITEMS ============
DROP POLICY IF EXISTS "Admins full access proposal_day_items" ON public.proposal_day_items;
DROP POLICY IF EXISTS "Customer view published proposal_day_items" ON public.proposal_day_items;
DROP POLICY IF EXISTS "Anon view shared proposal_day_items" ON public.proposal_day_items;

CREATE POLICY "Admins full access proposal_day_items"
ON public.proposal_day_items AS PERMISSIVE FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Customer view published proposal_day_items"
ON public.proposal_day_items AS PERMISSIVE FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.proposals pr
    JOIN public.prospects p ON p.id = pr.prospect_id
    WHERE pr.id = proposal_day_items.proposal_id
    AND pr.published_at IS NOT NULL
    AND p.email = auth.email()
  )
);

CREATE POLICY "Anon view shared proposal_day_items"
ON public.proposal_day_items AS PERMISSIVE FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.proposals
    WHERE proposals.id = proposal_day_items.proposal_id
    AND proposals.share_token IS NOT NULL
  )
);

-- ============ PROSPECTS: allow customer to read own prospect ============
CREATE POLICY "Customer can view own prospect"
ON public.prospects AS PERMISSIVE FOR SELECT TO authenticated
USING (email = auth.email());
