import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/hosts/[hostId]/custom-fields
 * Get all custom fields for a host (active only for public, all for admins)
 */
export async function GET(
  request: Request,
  { params }: { params: { hostId: string } }
) {
  const hostId = params.hostId
  const { searchParams } = new URL(request.url)
  const includeInactive = searchParams.get('include_inactive') === 'true'

  const supabase = await createServiceClient()

  // Check if requesting user is authenticated (for admin access)
  let isAdmin = false
  try {
    const { data: auth } = await requireAuth()
    if (auth) {
      // Check if user is site admin or host admin
      isAdmin =
        auth.isSiteAdmin ||
        (await supabase
          .from('linksy_provider_contacts')
          .select('id')
          .eq('provider_id', hostId)
          .eq('user_id', auth.user.id)
          .eq('status', 'active')
          .in('contact_type', ['provider_admin', 'org_admin'])
          .maybeSingle()
          .then((res) => !!res.data))
    }
  } catch {
    // Not authenticated, treat as public access
  }

  let query = supabase
    .from('linksy_host_custom_fields')
    .select('*')
    .eq('host_id', hostId)
    .order('sort_order', { ascending: true })

  // Public access only gets active fields
  if (!isAdmin || !includeInactive) {
    query = query.eq('is_active', true)
  }

  const { data: fields, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ fields: fields || [] })
}

/**
 * POST /api/hosts/[hostId]/custom-fields
 * Create a new custom field (admin only)
 */
export async function POST(
  request: Request,
  { params }: { params: { hostId: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const hostId = params.hostId
  const body = await request.json()

  const {
    field_label,
    field_type,
    field_options = [],
    placeholder,
    help_text,
    is_required = false,
    sort_order = 0,
  } = body

  if (!field_label || !field_type) {
    return NextResponse.json(
      { error: 'field_label and field_type are required' },
      { status: 400 }
    )
  }

  const validTypes = ['text', 'textarea', 'select', 'checkbox', 'date', 'email', 'phone']
  if (!validTypes.includes(field_type)) {
    return NextResponse.json(
      { error: `field_type must be one of: ${validTypes.join(', ')}` },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()

  // Check if user is site admin or host admin
  if (!auth.isSiteAdmin) {
    const { data: contact } = await supabase
      .from('linksy_provider_contacts')
      .select('id')
      .eq('provider_id', hostId)
      .eq('user_id', auth.user.id)
      .eq('status', 'active')
      .in('contact_type', ['provider_admin', 'org_admin'])
      .maybeSingle()

    if (!contact) {
      return NextResponse.json(
        { error: 'Only site admins and host admins can create custom fields' },
        { status: 403 }
      )
    }
  }

  const { data: field, error } = await supabase
    .from('linksy_host_custom_fields')
    .insert({
      host_id: hostId,
      field_label,
      field_type,
      field_options,
      placeholder,
      help_text,
      is_required,
      sort_order,
      created_by: auth.user.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(field, { status: 201 })
}
