
-- ============ PROPOSALS ============
DROP POLICY IF EXISTS "Admins can manage proposals" ON public.proposals;
DROP POLICY IF EXISTS "Authenticated can view own published proposals" ON public.proposals;
DROP POLICY IF EXISTS "Public can view proposals by share_token" ON public.proposals;

CREATE POLICY "Admins can manage proposals"
ON public.proposals AS PERMISSIVE FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view own published proposals"
ON public.proposals AS PERMISSIVE FOR SELECT TO authenticated
USING (
  published_at IS NOT NULL
  AND prospect_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.prospects p
    WHERE p.id = proposals.prospect_id
    AND p.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  )
);

CREATE POLICY "Public can view proposals by share_token"
ON public.proposals AS PERMISSIVE FOR SELECT TO anon
USING (share_token IS NOT NULL);

-- ============ PROPOSAL_DAYS ============
DROP POLICY IF EXISTS "Admins can manage proposal_days" ON public.proposal_days;
DROP POLICY IF EXISTS "Authenticated can view own published proposal_days" ON public.proposal_days;
DROP POLICY IF EXISTS "Public can view shared proposal_days" ON public.proposal_days;

CREATE POLICY "Admins can manage proposal_days"
ON public.proposal_days AS PERMISSIVE FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view own published proposal_days"
ON public.proposal_days AS PERMISSIVE FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.proposals pr
    JOIN public.prospects p ON p.id = pr.prospect_id
    WHERE pr.id = proposal_days.proposal_id
    AND pr.published_at IS NOT NULL
    AND p.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  )
);

CREATE POLICY "Public can view shared proposal_days"
ON public.proposal_days AS PERMISSIVE FOR SELECT TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.proposals
    WHERE proposals.id = proposal_days.proposal_id
    AND proposals.share_token IS NOT NULL
  )
);

-- ============ PROPOSAL_DAY_ITEMS ============
DROP POLICY IF EXISTS "Admins can manage proposal_day_items" ON public.proposal_day_items;
DROP POLICY IF EXISTS "Authenticated can view own published proposal_day_items" ON public.proposal_day_items;
DROP POLICY IF EXISTS "Public can view proposal_day_items for shared proposals" ON public.proposal_day_items;

CREATE POLICY "Admins can manage proposal_day_items"
ON public.proposal_day_items AS PERMISSIVE FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view own published proposal_day_items"
ON public.proposal_day_items AS PERMISSIVE FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.proposals pr
    JOIN public.prospects p ON p.id = pr.prospect_id
    WHERE pr.id = proposal_day_items.proposal_id
    AND pr.published_at IS NOT NULL
    AND p.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
  )
);

CREATE POLICY "Public can view proposal_day_items for shared proposals"
ON public.proposal_day_items AS PERMISSIVE FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.proposals
    WHERE proposals.id = proposal_day_items.proposal_id
    AND proposals.share_token IS NOT NULL
  )
);
