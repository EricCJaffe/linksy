import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * GET /api/admin/provider-applications/[id]
 * Get a single provider application
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { id } = await params
  const supabase = await createServiceClient()

  const { data: application, error: fetchError } = await supabase
    .from('linksy_provider_applications')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  return NextResponse.json(application)
}

/**
 * PATCH /api/admin/provider-applications/[id]
 * Approve or reject a provider application
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { id } = await params
  const body = await request.json()
  const { action, notes } = body as { action: 'approve' | 'reject'; notes?: string }

  if (!action || !['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const supabase = await createServiceClient()

  // Fetch the application
  const { data: application, error: fetchError } = await supabase
    .from('linksy_provider_applications')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !application) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 })
  }

  if (application.status !== 'pending') {
    return NextResponse.json(
      { error: `Application has already been ${application.status}` },
      { status: 400 }
    )
  }

  if (action === 'reject') {
    const { error: updateError } = await supabase
      .from('linksy_provider_applications')
      .update({
        status: 'rejected',
        reviewer_id: auth.user.id,
        reviewed_at: new Date().toISOString(),
        reviewer_notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to reject application' }, { status: 500 })
    }

    return NextResponse.json({ success: true, status: 'rejected' })
  }

  // Approve: create provider + location, then update application

  // Generate unique slug
  const base = application.org_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const { data: existing } = await supabase
    .from('linksy_providers')
    .select('slug')
    .ilike('slug', `${base}%`)

  const usedSlugs = new Set((existing || []).map((r: any) => r.slug))
  let slug = base
  let i = 2
  while (usedSlugs.has(slug)) {
    slug = `${base}-${i++}`
  }

  // Create provider
  const { data: provider, error: providerError } = await supabase
    .from('linksy_providers')
    .insert({
      name: application.org_name,
      slug,
      description: application.description || null,
      sector: application.sector || 'nonprofit',
      phone: application.phone || null,
      email: application.contact_email,
      website: application.website || null,
      hours: application.hours || null,
      is_active: true,
      project_status: 'active',
      referral_type: 'standard',
      allow_auto_update: false,
    })
    .select('id')
    .single()

  if (providerError || !provider) {
    console.error('Error creating provider:', providerError)
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 })
  }

  // Create primary location if any address fields provided
  const hasLocation = application.address || application.city || application.state || application.postal_code
  if (hasLocation) {
    const { error: locationError } = await supabase
      .from('linksy_locations')
      .insert({
        provider_id: provider.id,
        address_line1: application.address || null,
        city: application.city || null,
        state: application.state || null,
        postal_code: application.postal_code || null,
        is_primary: true,
      })

    if (locationError) {
      console.error('Error creating location:', locationError)
      // Non-fatal — provider was already created
    }
  }

  // Update application
  const { error: updateError } = await supabase
    .from('linksy_provider_applications')
    .update({
      status: 'approved',
      reviewer_id: auth.user.id,
      reviewed_at: new Date().toISOString(),
      reviewer_notes: notes || null,
      created_provider_id: provider.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    console.error('Error updating application:', updateError)
  }

  return NextResponse.json({
    success: true,
    status: 'approved',
    providerId: provider.id,
  })
}
