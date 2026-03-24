import { NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { remediateSupportTicket } from '@/lib/utils/ai-remediate'
import type { TriageResult } from '@/lib/utils/ai-triage'

/**
 * POST /api/support-tickets/[id]/remediate
 * Approve and trigger AI remediation for a triaged support ticket.
 * Creates a branch + PR on GitHub with the suggested fix.
 * Site admin only.
 *
 * Returns 202 immediately. The pipeline runs in the background via
 * @vercel/functions waitUntil() which continues execution after the
 * response is sent — avoids function timeout on all Vercel plans.
 * The UI polls the ticket status every 3s to pick up the result.
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

  // Validate not already in progress — but allow retry if stuck for >2 minutes
  if (ticket.remediation_status === 'generating') {
    const approvedAt = ticket.remediation_approved_at
      ? new Date(ticket.remediation_approved_at).getTime()
      : 0
    const stuckThreshold = 2 * 60 * 1000 // 2 minutes
    const isStuck = Date.now() - approvedAt > stuckThreshold

    if (!isStuck) {
      return NextResponse.json(
        { error: 'Remediation is already in progress' },
        { status: 409 }
      )
    }
    console.warn(`Remediation for ${id} was stuck in 'generating' state — allowing retry`)
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

  // Run the pipeline in the background using waitUntil().
  // This continues execution after the 202 response is sent,
  // so the function doesn't timeout waiting for OpenAI + GitHub.
  // The remediateSupportTicket function updates the ticket status
  // in the DB — the UI polls every 3s to pick it up.
  waitUntil(
    remediateSupportTicket({
      ticketId: id,
      ticketNumber: ticket.ticket_number,
      subject: ticket.subject,
      description: ticket.description,
      triage: ticket.ai_triage as TriageResult,
      approvedBy: auth.user.id,
    }).catch((err) => {
      console.error('Background remediation failed:', err)
      // remediateSupportTicket already sets status to 'failed' in its catch block
    })
  )

  return NextResponse.json(
    { status: 'approved', message: 'Remediation started' },
    { status: 202 }
  )
}
