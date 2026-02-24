import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'
import type { Provider, ProviderHierarchy } from '@/lib/types/linksy'

/**
 * GET /api/providers/[id]/hierarchy
 * Get full hierarchy for a provider (parent + children)
 * Returns the provider itself, its parent (if any), and its children (if any)
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const providerId = params.id
  const supabase = await createServiceClient()

  // Check if user has access to this provider
  const isSiteAdmin = auth.isSiteAdmin

  if (!isSiteAdmin) {
    // Use the helper function to check access
    const { data: hasAccess } = await supabase.rpc(
      'linksy_user_can_access_provider',
      {
        p_user_id: auth.user.id,
        p_provider_id: providerId,
      }
    )

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
  }

  // Fetch the provider itself
  const { data: provider, error: providerError } = await supabase
    .from('linksy_providers')
    .select('*')
    .eq('id', providerId)
    .single()

  if (providerError || !provider) {
    return NextResponse.json(
      { error: 'Provider not found' },
      { status: 404 }
    )
  }

  let parent: Provider | null = null
  let children: Provider[] = []

  // Fetch parent if exists
  if (provider.parent_provider_id) {
    const { data: parentData } = await supabase
      .from('linksy_providers')
      .select('*')
      .eq('id', provider.parent_provider_id)
      .single()

    if (parentData) {
      parent = parentData as Provider
    }
  }

  // Fetch children
  const { data: childrenData } = await supabase
    .from('linksy_providers')
    .select('*')
    .eq('parent_provider_id', providerId)
    .order('name')

  if (childrenData) {
    children = childrenData as Provider[]
  }

  const hierarchy: ProviderHierarchy = {
    provider: provider as Provider,
    parent,
    children,
  }

  return NextResponse.json(hierarchy)
}
