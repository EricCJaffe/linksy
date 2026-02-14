import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validatePagination, sanitizeError } from '@/lib/utils/validation'
import { logger } from '@/lib/utils/logger'

interface TenantUser {
  tenant_id: string
  role: string
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant
    const { data: tenantUser } = await supabase
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single<TenantUser>()

    if (!tenantUser) {
      return NextResponse.json(
        { error: 'User not associated with a tenant' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') || 'company' // 'personal' or 'company'
    const actionType = searchParams.get('action_type')
    const { limit, offset } = validatePagination(
      searchParams.get('limit') || '20',
      searchParams.get('offset')
    )

    // Build query for activities
    let query = supabase
      .from('audit_logs')
      .select(
        '*, user:users!audit_logs_user_id_fkey(email, full_name, avatar_url)',
        {
          count: 'exact',
        }
      )
      .eq('tenant_id', tenantUser.tenant_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by scope
    if (scope === 'personal') {
      query = query.eq('user_id', user.id)
    }

    // Filter by action type
    if (actionType) {
      query = query.eq('action', actionType)
    }

    const { data: activities, error, count } = await query

    if (error) {
      logger.apiError('/api/activity', 'GET', error as Error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Calculate pagination info
    const total = count || 0
    const hasMore = offset + limit < total
    const nextOffset = offset + limit

    return NextResponse.json({
      activities: activities || [],
      pagination: {
        hasMore,
        nextOffset,
        total,
      },
    })
  } catch (error) {
    logger.apiError(
      '/api/activity',
      'GET',
      error instanceof Error ? error : new Error('Failed to fetch activities')
    )
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch activities',
      },
      { status: 500 }
    )
  }
}
