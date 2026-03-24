import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { remediateSupportTicket } from '@/lib/utils/ai-remediate'
import type { TriageResult } from '@/lib/utils/ai-triage'

// Allow up to 120s for this route (Vercel Pro/Enterprise)
export const maxDuration = 120

/**
 * POST /api/support-tickets/[id]/remediate
 * Approve and trigger AI remediation for a triaged support ticket.
 * Creates a branch + PR on GitHub with the suggested fix.
 * Site admin only.
 *
 * Returns 202 immediately and runs remediation in the background.
 * The client polls the ticket detail endpoint to detect completion.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error: authError } = await requireSiteAdmin()
  if (authError) return authError

  const { id } = params
  const supabase = await createServiceClient()

  // Get ticket with triage data
  const { data: ticket, error: ticketError } = await supabase
    .from('linksy_support_tickets')
    .select('*')
    .eq('id', id)
    .single()

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 })
  }

  // Validate triage is complete
  if (ticket.ai_triage_status !== 'complete' || !ticket.ai_triage) {
    return NextResponse.json(
      { error: 'AI triage must be complete before remediation can start' },
      { status: 400 }
    )
  }

  // Validate not already in progress
  if (ticket.remediation_status === 'generating') {
    return NextResponse.json(
      { error: 'Remediation is already in progress' },
      { status: 409 }
    )
  }

  // Check required env vars
  const missing: string[] = []
  if (!process.env.OPENAI_API_KEY) missing.push('OPENAI_API_KEY')
  if (!process.env.GITHUB_TOKEN) missing.push('GITHUB_TOKEN')
  if (!process.env.GITHUB_OWNER) missing.push('GITHUB_OWNER')
  if (!process.env.GITHUB_REPO) missing.push('GITHUB_REPO')

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required environment variables: ${missing.join(', ')}` },
      { status: 503 }
    )
  }

  // Mark as approved
  await supabase
    .from('linksy_support_tickets')
    .update({
      remediation_status: 'approved',
      remediation_approved_by: auth.user.id,
      remediation_approved_at: new Date().toISOString(),
    })
    .eq('id', id)

  // Fire-and-forget: run remediation in the background.
  // The UI polls every 3s via useSupportTicket() and will pick up
  // the status transition from 'generating' → 'pr_created' or 'failed'.
  remediateSupportTicket({
    ticketId: id,
    ticketNumber: ticket.ticket_number,
    subject: ticket.subject,
    description: ticket.description,
    triage: ticket.ai_triage as TriageResult,
    approvedBy: auth.user.id,
  }).catch((err) => {
    // Error handling is already done inside remediateSupportTicket
    // (sets remediation_status='failed' in the database).
    // This catch just prevents unhandled promise rejection.
    console.error('Background remediation failed:', err)
  })

  // Return immediately — client will poll for the result
  return NextResponse.json({
    status: 'approved',
    message: 'Remediation started. The ticket will be updated when the PR is ready.',
  }, { status: 202 })
}
