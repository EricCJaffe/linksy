import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * GET /api/admin/referrals/duplicates
 * List referrals flagged as potential duplicates
 */
export async function GET() {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const supabase = await createServiceClient()

  const { data: tickets, error: fetchError } = await supabase
    .from('linksy_tickets')
    .select(`
      id,
      ticket_number,
      status,
      client_name,
      client_email,
      client_phone,
      duplicate_flag_type,
      created_at,
      provider:linksy_providers!provider_id(id, name),
      need:linksy_needs!need_id(id, name)
    `)
    .not('duplicate_flag_type', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  return NextResponse.json({ tickets: tickets || [] })
}
