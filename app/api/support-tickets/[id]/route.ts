import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/support-tickets/[id]
 * Get support ticket detail with comments
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = params
  const supabase = await createServiceClient()

  const { data: ticket, error } = await supabase
    .from('linksy_support_tickets')
    .select(`
      *,
      provider:linksy_providers(name),
      comments:linksy_support_ticket_comments(
        id,
        ticket_id,
        author_id,
        author_name,
        content,
        is_internal,
        created_at
      )
    `)
    .eq('id', id)
    .single()

  if (error || !ticket) {
    return NextResponse.json({ error: 'Support ticket not found' }, { status: 404 })
  }

  // Order comments by created_at
  if (ticket.comments) {
    ticket.comments.sort((a: any, b: any) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
  }

  return NextResponse.json(ticket)
}

/**
 * PATCH /api/support-tickets/[id]
 * Update support ticket
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = params
  const body = await request.json()
  const supabase = await createServiceClient()

  const allowedFields = ['status', 'priority', 'assigned_to', 'category']
  const updates: Record<string, any> = {}

  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key]
    }
  }

  // Set resolved_at when status changes to resolved
  if (body.status === 'resolved' && updates.status === 'resolved') {
    updates.resolved_at = new Date().toISOString()
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data: ticket, error } = await supabase
    .from('linksy_support_tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(ticket)
}
