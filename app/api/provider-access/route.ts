import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/provider-access
 * Returns provider info if current user is linked to a provider via linksy_provider_contacts
 */
export async function GET() {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const supabase = await createServiceClient()

  // Check if user is linked to any provider
  const { data: providerContact, error } = await supabase
    .from('linksy_provider_contacts')
    .select(`
      id,
      provider_id,
      is_primary_contact,
      job_title,
      provider:linksy_providers(
        id,
        name,
        slug,
        sector,
        is_active
      )
    `)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If no provider contact found, user doesn't have provider access
  if (!providerContact) {
    return NextResponse.json({ hasAccess: false, provider: null })
  }

  return NextResponse.json({
    hasAccess: true,
    provider: providerContact.provider,
    isPrimaryContact: providerContact.is_primary_contact,
    jobTitle: providerContact.job_title,
  })
}
