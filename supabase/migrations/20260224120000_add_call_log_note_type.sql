-- Add call_log to note_type enum
ALTER TYPE linksy_note_type ADD VALUE IF NOT EXISTS 'call_log';
