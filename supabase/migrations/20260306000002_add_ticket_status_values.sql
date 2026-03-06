-- Add new ticket status values: in_process and transferred_another_provider
-- TASK-014: Support "In Process" and "Transferred Another Provider" statuses

ALTER TYPE linksy_ticket_status ADD VALUE IF NOT EXISTS 'in_process';
ALTER TYPE linksy_ticket_status ADD VALUE IF NOT EXISTS 'transferred_another_provider';
