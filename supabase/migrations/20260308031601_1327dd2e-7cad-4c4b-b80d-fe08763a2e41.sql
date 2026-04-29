-- 1. Add segment to sales_goals
ALTER TABLE public.sales_goals ADD COLUMN IF NOT EXISTS segment TEXT NOT NULL DEFAULT 'geral';

-- 2. Create calendar_events table
CREATE TABLE public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  event_type TEXT NOT NULL DEFAULT 'meeting',
  segment TEXT,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  proposal_id UUID REFERENCES public.proposals(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage calendar_events"
  ON public.calendar_events
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Create itinerary_checklist table
CREATE TABLE public.itinerary_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  task_label TEXT NOT NULL,
  is_done BOOLEAN NOT NULL DEFAULT false,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.itinerary_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage itinerary_checklist"
  ON public.itinerary_checklist
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));