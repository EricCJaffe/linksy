import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { convertToCSV } from '@/lib/utils/csv'

/**
 * GET /api/admin/export/referrals
 * Export referrals/tickets to CSV
 */
export async function GET(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const includeLegacy = searchParams.get('includeLegacy') === 'true'

  const supabase = await createServiceClient()

  let query = supabase
    .from('linksy_tickets')
    .select(`
      ticket_number,
      status,
      client_name,
      client_email,
      client_phone,
      description_of_need,
      source,
      created_at,
      updated_at,
      provider:linksy_providers(name),
      need:linksy_needs(name)
    `)
    .order('created_at', { ascending: false })

  if (!includeLegacy) {
    query = query.is('legacy_id', null)
  }

  if (status && status !== 'all') {
    if (status === 'open') {
      query = query.eq('status', 'pending')
    } else if (status === 'closed') {
      query = query.in('status', [
        'customer_need_addressed',
        'unable_to_assist',
        'client_unresponsive',
        'wrong_organization_referred',
        'outside_of_scope',
        'client_not_eligible'
      ])
    }
  }

  const { data: tickets, error: ticketsError } = await query

  if (ticketsError) {
    console.error('Error fetching tickets:', ticketsError)
    return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 })
  }

  // Flatten the data for CSV
  const flatTickets = (tickets || []).map((ticket: any) => ({
    ticket_number: ticket.ticket_number,
    status: ticket.status,
    client_name: ticket.client_name,
    client_email: ticket.client_email,
    client_phone: ticket.client_phone,
    provider_name: ticket.provider?.name,
    need: ticket.need?.name,
    description: ticket.description_of_need,
    source: ticket.source,
    created_at: ticket.created_at,
    updated_at: ticket.updated_at,
  }))

  const csv = convertToCSV(flatTickets, [
    { key: 'ticket_number', header: 'Ticket Number' },
    { key: 'status', header: 'Status' },
    { key: 'client_name', header: 'Client Name' },
    { key: 'client_email', header: 'Client Email' },
    { key: 'client_phone', header: 'Client Phone' },
    { key: 'provider_name', header: 'Provider' },
    { key: 'need', header: 'Need' },
    { key: 'description', header: 'Description' },
    { key: 'source', header: 'Source' },
    { key: 'created_at', header: 'Created Date' },
    { key: 'updated_at', header: 'Updated Date' },
  ])

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="referrals-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
