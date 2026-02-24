import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * POST /api/providers/[id]/contacts
 * Create a new contact for a provider
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id: providerId } = params
  const body = await request.json()
  const supabase = await createServiceClient()

  // Validate required fields
  if (!body.email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  // Check if user already exists with this email
  let userId = body.user_id || null
  if (body.email && !userId) {
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', body.email)
      .single()

    if (existingUser) {
      userId = existingUser.id
    }
  }

  // Create the contact
  const { data: contact, error: insertError } = await supabase
    .from('linksy_provider_contacts')
    .insert({
      provider_id: providerId,
      user_id: userId,
      email: userId ? null : body.email, // Store email temporarily if no user yet
      full_name: userId ? null : body.full_name, // Store full_name temporarily if no user yet
      job_title: body.job_title || null,
      phone: body.phone || null,
      contact_type: body.contact_type || 'provider_employee',
      provider_role: body.provider_role || 'user',
      is_primary_contact: body.is_primary_contact || false,
      is_default_referral_handler: body.is_default_referral_handler || false,
      status: userId ? 'active' : 'pending',
      invitation_sent_at: null,  // Don't set until invite is actually sent
    })
    .select()
    .single()

  if (insertError) {
    console.error('Error creating contact:', insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(contact, { status: 201 })
}
