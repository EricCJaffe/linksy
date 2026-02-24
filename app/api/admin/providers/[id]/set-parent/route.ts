import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * POST /api/admin/providers/[id]/set-parent
 * Link/unlink a provider to/from a parent organization
 * Site admin only
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error: authError } = await requireSiteAdmin()
  if (authError) return authError

  const { parent_provider_id } = await request.json()
  const providerId = params.id

  // Validate: parent_provider_id must be null (to unlink) or a valid UUID
  if (parent_provider_id !== null && typeof parent_provider_id !== 'string') {
    return NextResponse.json(
      { error: 'parent_provider_id must be null or a valid provider ID' },
      { status: 400 }
    )
  }

  const supabase = await createServiceClient()

  // If unlinking (parent_provider_id is null), just update
  if (parent_provider_id === null) {
    const { error } = await supabase
      .from('linksy_providers')
      .update({
        parent_provider_id: null,
        parent_linked_by: null,
        parent_linked_at: null,
      })
      .eq('id', providerId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Provider unlinked from parent',
    })
  }

  // Validate: parent must exist
  const { data: parent, error: parentError } = await supabase
    .from('linksy_providers')
    .select('id, name, parent_provider_id')
    .eq('id', parent_provider_id)
    .single()

  if (parentError || !parent) {
    return NextResponse.json(
      { error: 'Parent provider not found' },
      { status: 404 }
    )
  }

  // Validate: parent cannot itself be a child (only 1 level depth)
  if (parent.parent_provider_id !== null) {
    return NextResponse.json(
      {
        error:
          'The selected parent is itself a child provider. Only one level of hierarchy is supported. Please select a top-level parent organization.',
      },
      { status: 400 }
    )
  }

  // Validate: provider being linked cannot be a parent of other providers
  const { data: existingChildren } = await supabase
    .from('linksy_providers')
    .select('id')
    .eq('parent_provider_id', providerId)
    .limit(1)

  if (existingChildren && existingChildren.length > 0) {
    return NextResponse.json(
      {
        error:
          'This provider is already a parent of other providers. Please unlink its children first before making it a child.',
      },
      { status: 400 }
    )
  }

  // Link to parent
  const { error: updateError } = await supabase
    .from('linksy_providers')
    .update({
      parent_provider_id,
      parent_linked_by: auth.user.id,
      parent_linked_at: new Date().toISOString(),
    })
    .eq('id', providerId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    message: `Provider linked to parent: ${parent.name}`,
    parent_provider_id,
  })
}
