import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { convertToCSV } from '@/lib/utils/csv'

/**
 * GET /api/admin/export/providers
 * Export providers to CSV
 */
export async function GET(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'

  const supabase = await createServiceClient()

  let query = supabase
    .from('linksy_providers')
    .select(`
      id,
      name,
      description,
      sector,
      phone,
      email,
      website,
      is_active,
      project_status,
      referral_type,
      created_at
    `)
    .order('name', { ascending: true })

  if (status && status !== 'all') {
    query = query.eq('is_active', status === 'active')
  }

  const { data: providers, error: providersError } = await query

  if (providersError) {
    console.error('Error fetching providers:', providersError)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }

  const csv = convertToCSV(providers || [], [
    { key: 'name', header: 'Provider Name' },
    { key: 'sector', header: 'Sector' },
    { key: 'phone', header: 'Phone' },
    { key: 'email', header: 'Email' },
    { key: 'website', header: 'Website' },
    { key: 'project_status', header: 'Project Status' },
    { key: 'referral_type', header: 'Referral Type' },
    { key: 'is_active', header: 'Active' },
    { key: 'created_at', header: 'Created Date' },
  ])

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="providers-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
