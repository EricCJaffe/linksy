import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { convertToCSV } from '@/lib/utils/csv'

/**
 * GET /api/admin/export/call-logs
 * Export call logs to CSV
 */
export async function GET(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')

  const supabase = await createServiceClient()

  let query = supabase
    .from('linksy_call_logs')
    .select('*, linksy_tickets!left(ticket_number), linksy_providers!left(name)')
    .order('created_at', { ascending: false })

  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo)

  const { data: logs, error: fetchError } = await query

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  const flat = (logs || []).map((l: any) => ({
    ticket_number: l.linksy_tickets?.ticket_number || '',
    provider_name: l.linksy_providers?.name || '',
    caller_name: l.caller_name,
    call_type: l.call_type,
    duration_minutes: l.duration_minutes,
    notes: l.notes,
    created_at: l.created_at,
  }))

  const csv = convertToCSV(flat, [
    { key: 'ticket_number', header: 'Ticket #' },
    { key: 'provider_name', header: 'Provider' },
    { key: 'caller_name', header: 'Caller' },
    { key: 'call_type', header: 'Type' },
    { key: 'duration_minutes', header: 'Duration (min)' },
    { key: 'notes', header: 'Notes' },
    { key: 'created_at', header: 'Date' },
  ])

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="call-logs-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
