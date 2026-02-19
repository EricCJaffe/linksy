import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireTenantAdmin } from '@/lib/middleware/auth'
import type { TicketStatus } from '@/lib/types/linksy'

const validStatuses: TicketStatus[] = [
  'pending',
  'customer_need_addressed',
  'wrong_organization_referred',
  'outside_of_scope',
  'client_not_eligible',
  'unable_to_assist',
  'client_unresponsive',
]

/**
 * PATCH /api/tickets/bulk
 * Bulk update ticket statuses
 */
export async function PATCH(request: Request) {
  const { data: auth, error } = await requireTenantAdmin()
  if (error) return error

  const body = await request.json()
  const { ids, status } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }

  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  const { error: updateError, count } = await supabase
    .from('linksy_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .in('id', ids)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ updated: count ?? ids.length })
}
