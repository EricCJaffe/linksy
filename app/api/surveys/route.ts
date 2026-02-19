import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/surveys
 * List all surveys (admin dashboard view)
 */
export async function GET(request: Request) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const ticketId = searchParams.get('ticket_id')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  const supabase = await createServiceClient()

  let query = supabase
    .from('linksy_surveys')
    .select('*, linksy_tickets!left(ticket_number, provider_id, status, linksy_providers!left(name))', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (ticketId) query = query.eq('ticket_id', ticketId)

  const { data: surveys, count, error: fetchError } = await query

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json({
    surveys: surveys || [],
    pagination: {
      total: count || 0,
      hasMore: offset + limit < (count || 0),
    },
  })
}

/**
 * POST /api/surveys
 * Create a survey invitation for a ticket (sends link to client)
 */
export async function POST(request: Request) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const body = await request.json()
  const { ticket_id, client_email } = body

  if (!ticket_id) {
    return NextResponse.json({ error: 'ticket_id is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { data: survey, error: insertError } = await supabase
    .from('linksy_surveys')
    .insert({
      ticket_id,
      client_email: client_email || null,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(survey, { status: 201 })
}
