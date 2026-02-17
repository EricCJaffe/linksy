import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * POST /api/admin/events/[eventId]/approve
 * Approve an event
 */
export async function POST(
  request: Request,
  { params }: { params: { eventId: string } }
) {
  const { data: auth, error: authError } = await requireSiteAdmin()
  if (authError) return authError

  const { eventId } = params
  const supabase = await createServiceClient()

  const { data: event, error: updateError } = await supabase
    .from('linksy_provider_events')
    .update({
      status: 'approved',
      approved_by: auth.user.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', eventId)
    .select()
    .single()

  if (updateError) {
    console.error('Error approving event:', updateError)
    return NextResponse.json({ error: 'Failed to approve event' }, { status: 500 })
  }

  return NextResponse.json(event)
}
