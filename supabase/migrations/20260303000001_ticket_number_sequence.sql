-- Create a sequence for ticket numbering starting at 2001
-- This replaces the read-count-then-insert pattern which has a race condition
CREATE SEQUENCE IF NOT EXISTS linksy_ticket_number_seq START WITH 2001;

-- Advance the sequence past any existing tickets to avoid collisions
DO $$
DECLARE
  max_seq INTEGER;
BEGIN
  -- Extract the numeric sequence part from existing ticket numbers (R-XXXX-YY)
  SELECT COALESCE(MAX(
    CAST(split_part(ticket_number, '-', 2) AS INTEGER)
  ), 2000) + 1
  INTO max_seq
  FROM linksy_tickets
  WHERE ticket_number IS NOT NULL AND ticket_number LIKE 'R-%';

  -- Only advance if existing tickets have higher numbers
  IF max_seq > 2001 THEN
    PERFORM setval('linksy_ticket_number_seq', max_seq, false);
  END IF;
END $$;

-- RPC function that atomically generates the next ticket number
-- Returns format: R-XXXX-YY where XXXX is from the sequence and YY is random
CREATE OR REPLACE FUNCTION linksy_next_ticket_number()
RETURNS TEXT
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'R-' || nextval('linksy_ticket_number_seq')::text || '-' || lpad((floor(random() * 100))::text, 2, '0');
$$;
