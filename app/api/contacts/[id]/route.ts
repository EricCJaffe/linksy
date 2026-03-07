import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/contacts/[id]
 * Get a single contact by ID with provider info
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id } = await params
  const supabase = await createServiceClient()

  const { data: contact, error } = await supabase
    .from('linksy_provider_contacts')
    .select('*, provider:linksy_providers!provider_id(id, name, is_active)')
    .eq('id', id)
    .single()

  if (error || !contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  // Enrich with user data if linked
  let displayName = contact.full_name
  let displayEmail = contact.email
  if (contact.user_id) {
    const { data: userData } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', contact.user_id)
      .single()
    if (userData) {
      displayName = displayName || userData.full_name
      displayEmail = displayEmail || userData.email
    }
  }

  return NextResponse.json({
    contact: {
      ...contact,
      display_name: displayName || displayEmail || 'Unknown',
      display_email: displayEmail,
    },
  })
}
