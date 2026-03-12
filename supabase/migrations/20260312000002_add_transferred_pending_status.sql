-- Migration: Add 'transferred_pending' status to linksy_ticket_status enum
-- TASK-026: Referral transfer workflow
-- When a referral is transferred to a new provider, the new provider sees it as "Transferred Pending"

ALTER TYPE linksy_ticket_status ADD VALUE IF NOT EXISTS 'transferred_pending';
