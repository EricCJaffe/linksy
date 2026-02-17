import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * POST /api/providers/[id]/contacts/[contactId]/invite
 * Send invitation email to a contact to create their account
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string; contactId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id: providerId, contactId } = params
  const body = await request.json()
  const supabase = await createServiceClient()

  // Get the contact details
  const { data: contact, error: contactError } = await supabase
    .from('linksy_provider_contacts')
    .select('*, provider:linksy_providers(name)')
    .eq('id', contactId)
    .eq('provider_id', providerId)
    .single()

  if (contactError || !contact) {
    return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
  }

  // Check if contact already has a user account
  if (contact.user_id) {
    return NextResponse.json({ error: 'Contact already has an account' }, { status: 400 })
  }

  // Get the contact's email from the body (for new contacts without user records yet)
  const email = body.email
  const fullName = body.full_name || body.name

  if (!email) {
    return NextResponse.json({ error: 'Email is required to send invitation' }, { status: 400 })
  }

  try {
    // Create auth user and send invitation via Supabase Auth
    // Note: This requires email templates to be configured in Supabase dashboard
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          full_name: fullName,
          provider_id: providerId,
          contact_id: contactId,
        },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      }
    )

    if (authError) {
      console.error('Error sending invitation:', authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Update contact with invitation timestamp
    await supabase
      .from('linksy_provider_contacts')
      .update({
        invitation_sent_at: new Date().toISOString(),
        status: 'invited',
      })
      .eq('id', contactId)

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      user: authData.user,
    })
  } catch (error) {
    console.error('Error sending invitation:', error)
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}
