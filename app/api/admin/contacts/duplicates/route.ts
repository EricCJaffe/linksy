import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * GET /api/admin/contacts/duplicates
 * Find potential duplicate contacts within a provider
 */
export async function GET(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const providerId = searchParams.get('provider_id')

  if (!providerId) {
    return NextResponse.json({ error: 'provider_id is required' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Fetch all contacts for this provider with user info
  const { data: contacts, error: fetchError } = await supabase
    .from('linksy_provider_contacts')
    .select('*, user:users(id, email, full_name)')
    .eq('provider_id', providerId)
    .eq('status', 'active')

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!contacts || contacts.length === 0) {
    return NextResponse.json({ duplicates: [] })
  }

  // Find duplicates by email
  const duplicateGroups: any[] = []
  const processed = new Set<string>()

  // Group by email
  const emailGroups = new Map<string, any[]>()

  for (const contact of contacts) {
    const email = contact.user?.email?.toLowerCase().trim()
    if (!email) continue

    if (!emailGroups.has(email)) {
      emailGroups.set(email, [])
    }
    emailGroups.get(email)!.push(contact)
  }

  // Find groups with more than one contact
  for (const [email, group] of Array.from(emailGroups.entries())) {
    if (group.length > 1) {
      duplicateGroups.push({
        email,
        contacts: group.map((c: any) => ({
          id: c.id,
          user_id: c.user_id,
          email: c.user?.email,
          full_name: c.user?.full_name,
          job_title: c.job_title,
          is_primary_contact: c.is_primary_contact,
          is_default_referral_handler: c.is_default_referral_handler,
          created_at: c.created_at,
        })),
      })
    }
  }

  return NextResponse.json({
    duplicates: duplicateGroups,
    total: duplicateGroups.length,
  })
}
