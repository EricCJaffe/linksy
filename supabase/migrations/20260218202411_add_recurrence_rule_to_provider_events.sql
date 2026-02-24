ALTER TABLE public.linksy_provider_events
  ADD COLUMN IF NOT EXISTS recurrence_rule TEXT DEFAULT NULL;;
