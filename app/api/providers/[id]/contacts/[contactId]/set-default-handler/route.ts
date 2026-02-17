import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * POST /api/providers/[id]/contacts/[contactId]/set-default-handler
 * Set a contact as the default referral handler for a provider
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; contactId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id: providerId, contactId } = params
  const supabase = await createServiceClient()

  // Verify the contact belongs to this provider
  const { data: contact, error: contactError } = await supabase
    .from('linksy_provider_contacts')
    .select('id, provider_id')
    .eq('id', contactId)
    .eq('provider_id', providerId)
    .single()

  if (contactError || !contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  // Update the contact to be the default handler
  // The trigger function will automatically unset other default handlers
  const { error: updateError } = await supabase
    .from('linksy_provider_contacts')
    .update({ is_default_referral_handler: true })
    .eq('id', contactId)

  if (updateError) {
    console.error('Error setting default handler:', updateError)
    return NextResponse.json({ error: 'Failed to set default handler' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
