import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/provider-access
 * Returns provider access info including parent/child relationships
 * - Direct contacts: providers user is directly linked to
 * - Parent admin access: child providers accessible via parent org admin role
 */
export async function GET() {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const supabase = await createServiceClient()

  // Fetch all providers user is directly linked to
  const { data: providerContacts, error } = await supabase
    .from('linksy_provider_contacts')
    .select(`
      id,
      provider_id,
      contact_type,
      is_primary_contact,
      job_title,
      provider:linksy_providers(
        id,
        name,
        slug,
        sector,
        is_active,
        parent_provider_id
      )
    `)
    .eq('user_id', auth.user.id)
    .eq('status', 'active')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // If no provider contacts found, user doesn't have provider access
  if (!providerContacts || providerContacts.length === 0) {
    return NextResponse.json({
      hasAccess: false,
      provider: null,
      accessibleProviderIds: [],
      accessLevel: null,
    })
  }

  // Build list of accessible provider IDs
  const accessibleProviderIds = new Set<string>()
  let primaryProvider = null
  const isAdminTypes = ['provider_admin', 'org_admin']

  // Add directly accessible providers
  for (const contact of providerContacts) {
    const provider = (contact as any).provider
    if (provider) {
      accessibleProviderIds.add(provider.id)

      // Track primary provider for backwards compatibility
      if (!primaryProvider || contact.is_primary_contact) {
        primaryProvider = provider
      }

      // If user is admin of a parent org, add all child providers
      const isAdmin = isAdminTypes.includes(contact.contact_type)
      if (isAdmin) {
        // Fetch children of this provider
        const { data: children } = await supabase
          .from('linksy_providers')
          .select('id')
          .eq('parent_provider_id', provider.id)

        if (children) {
          children.forEach(child => accessibleProviderIds.add(child.id))
        }
      }
    }
  }

  // Determine access level
  const hasDirectAccess = providerContacts.length > 0
  const hasParentAdminAccess = providerContacts.some(c =>
    isAdminTypes.includes(c.contact_type)
  )

  const accessLevel = auth.isSiteAdmin
    ? 'site_admin'
    : hasParentAdminAccess
    ? 'parent_admin'
    : 'self'

  return NextResponse.json({
    hasAccess: true,
    provider: primaryProvider,
    accessibleProviderIds: Array.from(accessibleProviderIds),
    accessLevel,
    providerContacts: providerContacts.map((c: any) => ({
      provider_id: c.provider_id,
      provider_name: c.provider?.name,
      contact_type: c.contact_type,
      is_primary_contact: c.is_primary_contact,
      job_title: c.job_title,
    })),
  })
}
