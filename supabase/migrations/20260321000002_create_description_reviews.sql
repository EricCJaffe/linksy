-- Auto-update provider descriptions: quarterly AI scan + provider review cycle
-- Tracks each review cycle and provider response

CREATE TABLE IF NOT EXISTS linksy_description_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES linksy_providers(id) ON DELETE CASCADE,
  -- Current description at time of scan
  current_description TEXT,
  -- AI-suggested description from website scan
  ai_suggested_description TEXT,
  -- Status: pending (email sent), accepted_current (no changes), accepted_ai (took AI suggestion),
  --         edited (provider logged in and edited), expired (no response after 30 days)
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted_current', 'accepted_ai', 'edited', 'expired', 'error')),
  -- Secure token for email action links (no login required for accept/reject)
  action_token UUID NOT NULL DEFAULT gen_random_uuid(),
  -- When the review was triggered
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- When the provider responded
  responded_at TIMESTAMPTZ,
  -- Who/what triggered: 'cron' or admin user ID
  triggered_by TEXT NOT NULL DEFAULT 'cron',
  -- Error message if AI scan failed
  error_message TEXT,
  -- Batch identifier to group reviews from same cron run
  batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_description_reviews_provider ON linksy_description_reviews(provider_id);
CREATE INDEX idx_description_reviews_status ON linksy_description_reviews(status) WHERE status = 'pending';
CREATE INDEX idx_description_reviews_token ON linksy_description_reviews(action_token);
CREATE INDEX idx_description_reviews_batch ON linksy_description_reviews(batch_id) WHERE batch_id IS NOT NULL;

-- Add next review date override column to providers
ALTER TABLE linksy_providers
  ADD COLUMN IF NOT EXISTS next_description_review_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_description_review_at TIMESTAMPTZ;

COMMENT ON COLUMN linksy_providers.next_description_review_at IS 'Admin override: when to next trigger description review (null = use default quarterly schedule)';
COMMENT ON COLUMN linksy_providers.last_description_review_at IS 'When the last description review was completed';

-- Seed the description_review email template
INSERT INTO linksy_email_templates (template_key, name, description, subject_template, html_template, text_template)
VALUES (
  'description_review',
  'Provider Description Review',
  'Sent quarterly to providers asking them to review their description against AI-scanned website content.',
  'Action Required: Please Review Your {{provider_name}} Description',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
<h2 style="color: #333;">Hello {{contact_name}},</h2>
<p>As part of our quarterly review process, we''ve compared your current provider description in our system with information found on your website. Please review the details below and let us know if any updates are needed.</p>

<h3 style="color: #555; border-bottom: 1px solid #ddd; padding-bottom: 8px;">Your Current Description</h3>
<div style="background: #f9f9f9; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
<p style="white-space: pre-wrap;">{{current_description}}</p>
</div>

<h3 style="color: #555; border-bottom: 1px solid #ddd; padding-bottom: 8px;">AI-Suggested Description (from your website)</h3>
<div style="background: #f0f7ff; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
<p style="white-space: pre-wrap;">{{ai_suggested_description}}</p>
</div>

<p><strong>Please choose one of the following options:</strong></p>

<div style="margin: 20px 0;">
<a href="{{accept_current_url}}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-right: 10px; margin-bottom: 10px;">No Changes Needed</a>
<a href="{{accept_ai_url}}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-right: 10px; margin-bottom: 10px;">Use AI Suggestion</a>
<a href="{{edit_url}}" style="display: inline-block; background: #6b7280; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-bottom: 10px;">Log In &amp; Edit</a>
</div>

<p style="color: #666; font-size: 14px;">This link expires in 30 days. If you have any questions, please contact us at {{support_email}}.</p>
<p style="color: #999; font-size: 12px;">Sent by {{app_name}}</p>
</div>',
  'Hello {{contact_name}},

As part of our quarterly review process, we''ve compared your current provider description with information found on your website.

YOUR CURRENT DESCRIPTION:
{{current_description}}

AI-SUGGESTED DESCRIPTION (from your website):
{{ai_suggested_description}}

Please choose one of the following options:
- No Changes Needed: {{accept_current_url}}
- Use AI Suggestion: {{accept_ai_url}}
- Log In & Edit: {{edit_url}}

This link expires in 30 days.
Sent by {{app_name}}'
)
ON CONFLICT (template_key) DO NOTHING;
