import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { convertToCSV } from '@/lib/utils/csv'

/**
 * GET /api/admin/export/surveys
 * Export survey results to CSV
 */
export async function GET(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  const supabase = await createServiceClient()

  let query = supabase
    .from('linksy_surveys')
    .select('*, linksy_tickets!left(ticket_number, linksy_providers!left(name))')
    .order('created_at', { ascending: false })

  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo)

  const { data: surveys, error: fetchError } = await query

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const flat = (surveys || []).map((s: any) => ({
    ticket_number: s.linksy_tickets?.ticket_number || '',
    provider_name: s.linksy_tickets?.linksy_providers?.name || '',
    client_email: s.client_email,
    rating: s.rating,
    feedback: s.feedback_text,
    completed_at: s.completed_at,
    created_at: s.created_at,
  }))

  const csv = convertToCSV(flat, [
    { key: 'ticket_number', header: 'Ticket #' },
    { key: 'provider_name', header: 'Provider' },
    { key: 'client_email', header: 'Client Email' },
    { key: 'rating', header: 'Rating' },
    { key: 'feedback', header: 'Feedback' },
    { key: 'completed_at', header: 'Completed' },
    { key: 'created_at', header: 'Sent' },
  ])

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="surveys-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
