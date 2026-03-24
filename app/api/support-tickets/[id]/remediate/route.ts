import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { remediateSupportTicket } from '@/lib/utils/ai-remediate'
import type { TriageResult } from '@/lib/utils/ai-triage'

// Safety net: read files + OpenAI + GitHub PR typically takes 15-30s,
// but allow up to 60s in case of slow API responses.
export const maxDuration = 60

/**
 * POST /api/support-tickets/[id]/remediate
 * Approve and trigger AI remediation for a triaged support ticket.
 * Creates a branch + PR on GitHub with the suggested fix.
 * Site admin only.
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
    // If stuck, allow retry — fall through to re-run
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

  try {
    // Run the full pipeline — maxDuration=120 keeps the function alive.
    // The UI polls every 3s and shows a spinner while this runs.
    const result = await remediateSupportTicket({
      ticketId: id,
      ticketNumber: ticket.ticket_number,
      subject: ticket.subject,
      description: ticket.description,
      triage: ticket.ai_triage as TriageResult,
      approvedBy: auth.user.id,
    })

    return NextResponse.json({
      status: 'pr_created',
      pr_url: result.pr_url,
      branch: result.branch,
      summary: result.summary,
      files_changed: result.files_changed,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Remediation failed'
    return NextResponse.json(
      { error: message },
      { status: 500 }
    )
  }
}
