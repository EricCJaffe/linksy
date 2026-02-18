-- Add recurrence_rule column to provider events for iCal RRULE support
ALTER TABLE public.linksy_provider_events
  ADD COLUMN IF NOT EXISTS recurrence_rule TEXT DEFAULT NULL;
