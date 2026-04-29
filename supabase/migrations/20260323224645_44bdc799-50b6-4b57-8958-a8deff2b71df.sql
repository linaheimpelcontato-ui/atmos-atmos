ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS reminder_24h_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manychat_subscriber_id text;