import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

export async function GET(request: Request) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const ticketId = searchParams.get('ticket_id')
  const providerId = searchParams.get('provider_id')
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  const supabase = await createServiceClient()

  let query = supabase
    .from('linksy_call_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (ticketId) query = query.eq('ticket_id', ticketId)
  if (providerId) query = query.eq('provider_id', providerId)

  const { data: callLogs, count, error: queryError } = await query

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  // Fetch creator names
  const logsWithCreators = await Promise.all(
    (callLogs || []).map(async (log: any) => {
      if (!log.created_by) return { ...log, creator: null }
      const { data: user } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', log.created_by)
        .maybeSingle()
      return { ...log, creator: user }
    })
  )

  return NextResponse.json({
    callLogs: logsWithCreators,
    pagination: {
      total: count || 0,
      hasMore: offset + limit < (count || 0),
      nextOffset: offset + limit < (count || 0) ? offset + limit : null,
    },
  })
}

export async function POST(request: Request) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const body = await request.json()
  const supabase = await createServiceClient()

  const { data: callLog, error: insertError } = await supabase
    .from('linksy_call_logs')
    .insert({
      ticket_id: body.ticket_id || null,
      provider_id: body.provider_id || null,
      caller_name: body.caller_name || null,
      call_type: body.call_type || 'outbound',
      duration_minutes: body.duration_minutes || null,
      notes: body.notes || null,
      created_by: auth.user.id,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(callLog, { status: 201 })
}
