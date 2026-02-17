import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/support-tickets
 * List support tickets (admin only)
 */
export async function GET(request: Request) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  const supabase = await createServiceClient()

  let query = supabase
    .from('linksy_support_tickets')
    .select(`
      *,
      provider:linksy_providers(name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: tickets, count, error: queryError } = await query

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json({
    tickets: tickets || [],
    pagination: {
      total: count || 0,
      hasMore: offset + limit < (count || 0),
      nextOffset: offset + limit < (count || 0) ? offset + limit : null,
    },
  })
}

/**
 * POST /api/support-tickets
 * Create a new support ticket
 */
export async function POST(request: Request) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const body = await request.json()
  const { subject, description, category, priority, provider_id } = body

  if (!subject || !description) {
    return NextResponse.json(
      { error: 'Subject and description are required' },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()

  // Get user info
  const { data: user } = await supabase
    .from('users')
    .select('full_name, email')
    .eq('id', auth.user.id)
    .single()

  // Generate ticket number (format: SUP-YYYYMMDD-XXXX)
  const date = new Date()
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')

  const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString()
  const { count } = await supabase
    .from('linksy_support_tickets')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', startOfDay)

  const sequentialNumber = String((count || 0) + 1).padStart(4, '0')
  const ticketNumber = `SUP-${dateStr}-${sequentialNumber}`

  const { data: ticket, error: insertError } = await supabase
    .from('linksy_support_tickets')
    .insert({
      ticket_number: ticketNumber,
      subject,
      description,
      category: category || 'other',
      priority: priority || 'medium',
      submitter_id: auth.user.id,
      submitter_name: user?.full_name || null,
      submitter_email: user?.email || auth.user.email,
      provider_id: provider_id || null,
      status: 'open',
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error creating support ticket:', insertError)
    return NextResponse.json({ error: 'Failed to create support ticket' }, { status: 500 })
  }

  return NextResponse.json(ticket, { status: 201 })
}
