import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * GET /api/admin/events
 * List all events (admin only)
 */
export async function GET(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') // pending, approved, rejected, all
  const limit = parseInt(searchParams.get('limit') || '100')

  const supabase = await createServiceClient()

  let query = supabase
    .from('linksy_provider_events')
    .select(`
      *,
      provider:linksy_providers(name)
    `)
    .order('event_date', { ascending: true })
    .limit(limit)

  if (status && status !== 'all') {
    query = query.eq('status', status)
  }

  const { data: events, error: eventsError } = await query

  if (eventsError) {
    console.error('Error fetching events:', eventsError)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }

  return NextResponse.json(events)
}
