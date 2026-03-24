import OpenAI from 'openai'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/utils/email'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

/** System architecture context for the AI to reference when analyzing tickets */
const SYSTEM_ARCHITECTURE = `
You are an expert software engineer analyzing a support ticket for the Linksy platform.

## Platform Overview
Linksy is an AI-powered community resource search and referral platform. It helps connect people in need with local service providers through natural language search powered by vector similarity + LLM matching. Multi-tenant SaaS architecture: Site (Impact Works) → Tenants (regions) → Providers → Locations.

## Tech Stack
- Next.js 14 App Router with TypeScript (strict mode)
- Supabase (PostgreSQL + pgvector + PostGIS) for database
- OpenAI (text-embedding-3-small + gpt-4o-mini) for AI search
- Tailwind CSS + shadcn/ui for UI components
- React Query v5 for data fetching
- React Hook Form + Zod for forms
- Vercel for deployment
- Resend for transactional email

## Key Code Areas
- app/api/linksy/search/route.ts — AI search pipeline (embedding → vector → LLM)
- app/api/linksy/tickets/route.ts — Public referral ticket creation
- app/api/tickets/ — Admin referral management
- app/api/support-tickets/ — Support ticket CRUD
- app/api/providers/ — Provider management
- app/api/stats/ + app/api/reports/ — Analytics and reporting
- app/find-help/page.tsx — Public chatbot search widget
- app/dashboard/ — Admin dashboard (providers, tickets, reports, contacts, events)
- components/ — React components (providers/, tickets/, admin/, ui/)
- lib/hooks/ — React Query hooks for all data fetching
- lib/utils/ — Utilities (email, phone formatting, duplicate detection, rate limiting)
- lib/supabase/server.ts — createClient() (respects RLS) vs createServiceClient() (bypasses RLS)
- lib/middleware/auth.ts — requireAuth(), requireSiteAdmin(), requireTenantAdmin()
- middleware.ts — Auth + rate limiting + CSRF protection
- supabase/migrations/ — Database migrations (PostgreSQL)

## Database Tables (prefixed linksy_*)
- linksy_providers — Service provider organizations
- linksy_provider_locations — Provider addresses with PostGIS geography
- linksy_provider_contacts — People at providers (login access)
- linksy_provider_notes — Notes/call logs on providers
- linksy_tickets — Referral tickets (client → provider)
- linksy_ticket_comments — Comments on referrals
- linksy_ticket_events — Audit trail for referral actions
- linksy_support_tickets — Support tickets (providers → Linksy staff)
- linksy_support_ticket_comments — Comments on support tickets
- linksy_need_categories + linksy_needs — Service taxonomy
- linksy_provider_events — Provider events/workshops
- linksy_search_sessions — AI search session tracking
- linksy_search_interactions — Click/view tracking
- linksy_crisis_keywords — Safety detection keywords
- linksy_hosts — Embedded widget host configurations
- linksy_email_templates — Customizable email templates
- linksy_referral_alert_config — SLA and alert configuration

## Auth Model
- Roles: site_admin > tenant_admin > user (in users table)
- Provider access: checked via linksy_user_can_access_provider() RPC
- RLS enforced on tenant-scoped tables
- Provider contacts have RLS disabled (auth at API layer)

## Common Issue Patterns
- Column drift: migrations may have dropped/renamed columns — always check migrations
- RLS mismatches: using createClient() when createServiceClient() is needed or vice versa
- React Query cache: stale data from missing invalidation
- Email template variable mismatches
- Type mismatches between database schema and TypeScript interfaces
- Missing error handling on API routes
- UI not reflecting latest database schema changes
`

export interface TriageResult {
  classification: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  affected_areas: string[]
  root_cause_hypothesis: string
  suggested_fix: string
  remediation_prompt: string
  investigation_steps: string[]
  confidence: number
  estimated_complexity: 'trivial' | 'small' | 'medium' | 'large'
}

interface TicketForTriage {
  id: string
  ticket_number: string
  subject: string
  description: string
  category: string | null
  priority: string | null
}

/**
 * Run AI triage analysis on a support ticket.
 * Updates the ticket in the database and sends admin email.
 */
export async function triageSupportTicket(ticket: TicketForTriage): Promise<TriageResult> {
  const supabase = await createServiceClient()

  // Mark as analyzing
  await supabase
    .from('linksy_support_tickets')
    .update({ ai_triage_status: 'analyzing' })
    .eq('id', ticket.id)

  try {
    const triage = await runTriageAnalysis(ticket)

    // Save result
    await supabase
      .from('linksy_support_tickets')
      .update({
        ai_triage: triage,
        ai_triage_status: 'complete',
      })
      .eq('id', ticket.id)

    // Send admin notification (fire-and-forget)
    void sendTriageEmail(ticket, triage)

    return triage
  } catch (err) {
    console.error('AI triage failed:', err)

    await supabase
      .from('linksy_support_tickets')
      .update({ ai_triage_status: 'failed' })
      .eq('id', ticket.id)

    throw err
  }
}

async function runTriageAnalysis(ticket: TicketForTriage): Promise<TriageResult> {
  const openai = getOpenAI()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: SYSTEM_ARCHITECTURE + `

## Your Task
Analyze the support ticket below and produce a triage report in JSON format.

Return ONLY valid JSON with this structure:
{
  "classification": "One of: bug, feature_request, configuration, data_issue, ui_ux, performance, security, documentation, integration, unknown",
  "severity": "One of: low, medium, high, critical",
  "affected_areas": ["Array of likely affected file paths. IMPORTANT: This is a Next.js 14 App Router project — page files are 'page.tsx' (NOT 'index.tsx'), API routes are 'route.ts', layouts are 'layout.tsx'. Use paths like 'app/dashboard/page.tsx', 'app/api/tickets/route.ts', 'components/tickets/ticket-detail-panel.tsx'. These paths will be used to read files from GitHub, so be as accurate as possible."],
  "root_cause_hypothesis": "Brief hypothesis about what might be causing the issue",
  "suggested_fix": "Clear description of the suggested fix approach",
  "remediation_prompt": "A complete, ready-to-use prompt for an AI coding assistant. Include specific file paths (using App Router conventions: page.tsx not index.tsx), what to search for, and what changes to make. Mention that this is a Next.js 14 App Router + Tailwind + shadcn/ui project. Be specific and actionable.",
  "investigation_steps": ["Array of ordered steps to investigate and fix this issue"],
  "confidence": 0.0 to 1.0,
  "estimated_complexity": "One of: trivial, small, medium, large"
}`,
      },
      {
        role: 'user',
        content: `## Support Ticket ${ticket.ticket_number}

**Subject:** ${ticket.subject}
**Category:** ${ticket.category || 'not specified'}
**Priority:** ${ticket.priority || 'not specified'}

**Description:**
${ticket.description}`,
      },
    ],
    max_tokens: 2000,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    throw new Error('OpenAI returned empty response')
  }

  return JSON.parse(content) as TriageResult
}

async function sendTriageEmail(
  ticket: TicketForTriage,
  triage: TriageResult
) {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) {
    console.warn('ADMIN_EMAIL not set, skipping triage notification email')
    return
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Linksy'
  const severityColors: Record<string, string> = {
    low: '#6b7280',
    medium: '#2563eb',
    high: '#ea580c',
    critical: '#dc2626',
  }
  const severityColor = severityColors[triage.severity] || '#6b7280'

  // Escape HTML in user-generated content
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto;">
      <h2 style="color: #111827; margin-bottom: 4px;">AI Triage: ${esc(ticket.ticket_number)}</h2>
      <p style="color: #6b7280; margin-top: 0; font-size: 14px;">${esc(ticket.subject)}</p>

      <div style="margin: 16px 0;">
        <span style="background: ${severityColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600; display: inline-block; margin-right: 8px;">
          ${triage.severity.toUpperCase()}
        </span>
        <span style="background: #f3f4f6; color: #374151; padding: 4px 12px; border-radius: 12px; font-size: 13px; display: inline-block; margin-right: 8px;">
          ${esc(triage.classification)}
        </span>
        <span style="background: #f3f4f6; color: #374151; padding: 4px 12px; border-radius: 12px; font-size: 13px; display: inline-block;">
          ${triage.estimated_complexity} complexity
        </span>
      </div>

      <h3 style="color: #111827; margin-bottom: 8px;">Root Cause Hypothesis</h3>
      <p style="color: #374151; font-size: 14px; line-height: 1.6;">${esc(triage.root_cause_hypothesis)}</p>

      <h3 style="color: #111827; margin-bottom: 8px;">Suggested Fix</h3>
      <p style="color: #374151; font-size: 14px; line-height: 1.6;">${esc(triage.suggested_fix)}</p>

      <h3 style="color: #111827; margin-bottom: 8px;">Affected Areas</h3>
      <ul style="color: #374151; font-size: 13px; font-family: 'SF Mono', Monaco, monospace; line-height: 1.8;">
        ${triage.affected_areas.map((a) => `<li>${esc(a)}</li>`).join('')}
      </ul>

      <h3 style="color: #111827; margin-bottom: 8px;">Investigation Steps</h3>
      <ol style="color: #374151; font-size: 14px; line-height: 1.8;">
        ${triage.investigation_steps.map((s) => `<li>${esc(s)}</li>`).join('')}
      </ol>

      <h3 style="color: #111827; margin-bottom: 8px;">Remediation Prompt</h3>
      <p style="color: #6b7280; font-size: 12px; margin-bottom: 8px;">Copy this prompt into Claude Code or an AI coding assistant:</p>
      <div style="background: #1e1e2e; color: #cdd6f4; padding: 16px; border-radius: 8px; font-family: 'SF Mono', Monaco, monospace; font-size: 13px; white-space: pre-wrap; line-height: 1.6; overflow-x: auto;">
${esc(triage.remediation_prompt)}
      </div>

      <div style="margin-top: 24px;">
        <a href="${appUrl}/dashboard/admin/support/${encodeURIComponent(ticket.id)}"
           style="display: inline-block; background: #2563eb; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
          View Ticket
        </a>
      </div>

      <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">
        AI confidence: ${Math.round(triage.confidence * 100)}% &mdash; Generated by ${esc(appName)}'s AI triage system.
      </p>
    </div>
  `

  try {
    await sendEmail({
      to: adminEmail,
      subject: `[${triage.severity.toUpperCase()}] AI Triage: ${ticket.ticket_number} — ${ticket.subject}`,
      html,
    })
  } catch (err) {
    console.error('Failed to send triage email:', err)
  }
}
