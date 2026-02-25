import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/middleware/auth'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET() {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  if (!auth.isSiteAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createServiceClient()

  try {
    // Count pending support tickets
    const { count: pendingTickets } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .in('status', ['open', 'in_progress'])

    // Count active hosts
    const { count: activeHosts } = await supabase
      .from('linksy_providers')
      .select('*', { count: 'exact', head: true })
      .eq('is_host', true)
      .eq('is_active', true)
      .eq('host_embed_active', true)

    // Count pending imports
    const { count: pendingImports } = await supabase
      .from('linksy_providers')
      .select('*', { count: 'exact', head: true })
      .eq('pending_approval', true)

    // Count active webhooks
    const { count: activeWebhooks } = await supabase
      .from('linksy_webhooks')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)

    return NextResponse.json({
      pendingTickets: pendingTickets || 0,
      activeHosts: activeHosts || 0,
      pendingImports: pendingImports || 0,
      activeWebhooks: activeWebhooks || 0,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
