import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import type { ReassignmentStats, ReassignmentReason } from '@/lib/types/linksy'

export async function GET(req: NextRequest) {
  try {
    const { error } = await requireSiteAdmin()
    if (error) return error

    const supabase = await createClient()

    // Get query parameters for date filtering
    const searchParams = req.nextUrl.searchParams
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')

    // Build date filter
    let dateFilter = ''
    const params: any[] = []
    if (dateFrom) {
      dateFilter += ' AND created_at >= $' + (params.length + 1)
      params.push(dateFrom)
    }
    if (dateTo) {
      dateFilter += ' AND created_at <= $' + (params.length + 1)
      params.push(dateTo)
    }

    // 1. Total reassignments (forwarded + reassigned events)
    const { data: totalData } = await supabase
      .from('linksy_ticket_events')
      .select('id', { count: 'exact', head: true })
      .in('event_type', ['reassigned', 'forwarded'])

    const totalReassignments = totalData?.length || 0

    // 2. Provider-initiated vs admin-initiated breakdown
    const { data: actorBreakdown } = await supabase
      .from('linksy_ticket_events')
      .select('actor_type')
      .in('event_type', ['reassigned', 'forwarded'])

    const providerInitiated =
      actorBreakdown?.filter(
        (e) => e.actor_type === 'provider_contact' || e.actor_type === 'provider_admin'
      ).length || 0

    const adminInitiated =
      actorBreakdown?.filter((e) => e.actor_type === 'site_admin').length || 0

    // 3. Average reassignments per ticket
    const { data: ticketData } = await supabase
      .from('linksy_tickets')
      .select('reassignment_count')
      .gt('reassignment_count', 0)

    const avgReassignments =
      ticketData && ticketData.length > 0
        ? ticketData.reduce((sum, t) => sum + t.reassignment_count, 0) / ticketData.length
        : 0

    // 4. Top forwarding providers (from events metadata)
    const { data: forwardingEvents } = await supabase
      .from('linksy_ticket_events')
      .select(`
        previous_state,
        ticket_id,
        tickets:linksy_tickets!ticket_id(provider_id)
      `)
      .eq('event_type', 'forwarded')

    const forwardingCounts: Record<string, { provider_id: string; count: number }> = {}

    if (forwardingEvents) {
      for (const event of forwardingEvents) {
        const providerId = event.previous_state?.provider_id
        if (providerId) {
          if (!forwardingCounts[providerId]) {
            forwardingCounts[providerId] = { provider_id: providerId, count: 0 }
          }
          forwardingCounts[providerId].count++
        }
      }
    }

    const topForwardingProviderIds = Object.values(forwardingCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Get provider names for top forwarders
    const forwardingProviderIds = topForwardingProviderIds.map((p) => p.provider_id)
    const { data: forwardingProviders } = await supabase
      .from('linksy_providers')
      .select('id, name')
      .in('id', forwardingProviderIds)

    const topForwardingProviders = topForwardingProviderIds
      .map((fc) => {
        const provider = forwardingProviders?.find((p) => p.id === fc.provider_id)
        return {
          provider_id: fc.provider_id,
          provider_name: provider?.name || 'Unknown',
          forward_count: fc.count,
        }
      })
      .filter((p) => p.provider_name !== 'Unknown')

    // 5. Top receiving providers (from events new_state)
    const { data: receivingEvents } = await supabase
      .from('linksy_ticket_events')
      .select('new_state')
      .in('event_type', ['reassigned', 'forwarded'])

    const receivingCounts: Record<string, number> = {}

    if (receivingEvents) {
      for (const event of receivingEvents) {
        const providerId = event.new_state?.provider_id
        if (providerId) {
          receivingCounts[providerId] = (receivingCounts[providerId] || 0) + 1
        }
      }
    }

    const topReceivingProviderIds = Object.entries(receivingCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id)

    // Get provider names for top receivers
    const { data: receivingProviders } = await supabase
      .from('linksy_providers')
      .select('id, name')
      .in('id', topReceivingProviderIds)

    const topReceivingProviders = topReceivingProviderIds
      .map((providerId) => {
        const provider = receivingProviders?.find((p) => p.id === providerId)
        return {
          provider_id: providerId,
          provider_name: provider?.name || 'Unknown',
          receive_count: receivingCounts[providerId],
        }
      })
      .filter((p) => p.provider_name !== 'Unknown')

    // 6. Reassignment reason breakdown
    const { data: reasonEvents } = await supabase
      .from('linksy_ticket_events')
      .select('reason')
      .in('event_type', ['reassigned', 'forwarded'])
      .not('reason', 'is', null)

    const reasonBreakdown: Record<ReassignmentReason, number> = {
      unable_to_assist: 0,
      wrong_org: 0,
      capacity: 0,
      other: 0,
      admin_reassignment: 0,
      internal_assignment: 0,
    }

    if (reasonEvents) {
      for (const event of reasonEvents) {
        if (event.reason) {
          reasonBreakdown[event.reason as ReassignmentReason] =
            (reasonBreakdown[event.reason as ReassignmentReason] || 0) + 1
        }
      }
    }

    // Build response
    const stats: ReassignmentStats = {
      total_reassignments: totalReassignments,
      provider_initiated: providerInitiated,
      admin_initiated: adminInitiated,
      average_reassignments_per_ticket: Math.round(avgReassignments * 100) / 100,
      top_forwarding_providers: topForwardingProviders,
      top_receiving_providers: topReceivingProviders,
      reason_breakdown: reasonBreakdown,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching reassignment stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
