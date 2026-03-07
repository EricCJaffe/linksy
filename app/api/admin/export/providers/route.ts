import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { convertToCSV } from '@/lib/utils/csv'

/**
 * GET /api/admin/export/providers
 * Export providers to CSV with source, zip, contact info
 */
export async function GET(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'
  const source = searchParams.get('source') || 'all'
  const zip = searchParams.get('zip') || ''

  const supabase = await createServiceClient()

  let query = supabase
    .from('linksy_providers')
    .select(`
      id,
      name,
      description,
      sector,
      phone,
      phone_extension,
      email,
      website,
      is_active,
      provider_status,
      project_status,
      referral_type,
      source,
      source_other,
      is_frozen,
      service_zip_codes,
      created_at,
      linksy_locations!inner(address_line1, city, state, postal_code, is_primary),
      linksy_provider_contacts(full_name, email, is_primary_contact)
    `)
    .order('name', { ascending: true })

  if (status && status !== 'all') {
    if (status === 'frozen') {
      query = query.eq('is_frozen', true)
    } else {
      query = query.eq('provider_status', status)
    }
  }

  if (source !== 'all') {
    query = query.eq('source', source)
  }

  // Remove inner join requirement when not filtering by zip
  if (!zip) {
    query = supabase
      .from('linksy_providers')
      .select(`
        id,
        name,
        description,
        sector,
        phone,
        phone_extension,
        email,
        website,
        is_active,
        provider_status,
        project_status,
        referral_type,
        source,
        source_other,
        is_frozen,
        service_zip_codes,
        created_at,
        linksy_locations(address_line1, city, state, postal_code, is_primary),
        linksy_provider_contacts(full_name, email, is_primary_contact)
      `)
      .order('name', { ascending: true })

    if (status && status !== 'all') {
      if (status === 'frozen') {
        query = query.eq('is_frozen', true)
      } else {
        query = query.eq('provider_status', status)
      }
    }
    if (source !== 'all') {
      query = query.eq('source', source)
    }
  }

  const { data: providers, error: providersError } = await query

  if (providersError) {
    console.error('Error fetching providers:', providersError)
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 })
  }

  // Post-process: flatten locations and contacts, filter by zip if needed
  let processed = (providers || []).map((p: any) => {
    const primaryLocation = (p.linksy_locations || []).find((l: any) => l.is_primary) || (p.linksy_locations || [])[0]
    const primaryContact = (p.linksy_provider_contacts || []).find((c: any) => c.is_primary_contact) || (p.linksy_provider_contacts || [])[0]
    return {
      name: p.name,
      sector: p.sector,
      phone: p.phone,
      phone_ext: p.phone_extension || '',
      email: p.email,
      contact_name: primaryContact?.full_name || '',
      contact_email: primaryContact?.email || '',
      address: primaryLocation?.address_line1 || '',
      city: primaryLocation?.city || '',
      state: primaryLocation?.state || '',
      zip: primaryLocation?.postal_code || '',
      source: p.source || '',
      source_other: p.source === 'Other' ? (p.source_other || '') : '',
      status: p.provider_status || (p.is_active ? 'active' : 'inactive'),
      frozen: p.is_frozen ? 'Yes' : 'No',
      referral_type: p.referral_type,
      created_at: p.created_at,
    }
  })

  // Filter by zip if provided
  if (zip) {
    processed = processed.filter((p: any) => p.zip === zip)
  }

  const csv = convertToCSV(processed, [
    { key: 'name', header: 'Provider Name' },
    { key: 'contact_name', header: 'Primary Contact' },
    { key: 'contact_email', header: 'Contact Email' },
    { key: 'phone', header: 'Phone' },
    { key: 'phone_ext', header: 'Phone Ext' },
    { key: 'email', header: 'Provider Email' },
    { key: 'address', header: 'Address' },
    { key: 'city', header: 'City' },
    { key: 'state', header: 'State' },
    { key: 'zip', header: 'Zip' },
    { key: 'source', header: 'Source' },
    { key: 'status', header: 'Status' },
    { key: 'frozen', header: 'Frozen' },
    { key: 'referral_type', header: 'Referral Type' },
    { key: 'sector', header: 'Sector' },
    { key: 'created_at', header: 'Date Added' },
  ])

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="providers-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
