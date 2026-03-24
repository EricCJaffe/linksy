import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { triageSupportTicket } from '@/lib/utils/ai-triage'

/**
 * POST /api/support-tickets/[id]/triage
 * Trigger or re-trigger AI triage analysis for a support ticket.
 * Site admin only.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { error: authError } = await requireSiteAdmin()
  if (authError) return authError

  const { id } = params
  const supabase = await createServiceClient()

  const { data: ticket, error: ticketError } = await supabase
    .from('linksy_support_tickets')
    .select('id, ticket_number, subject, description, category, priority')
    .eq('id', id)
    .single()

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 })
  }

  try {
    const triage = await triageSupportTicket(ticket)

    return NextResponse.json({ triage })
  } catch {
    return NextResponse.json(
      { error: 'AI triage analysis failed. Check server logs.' },
      { status: 500 }
    )
  }
}
