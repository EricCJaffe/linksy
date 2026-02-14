import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validatePagination, sanitizeError } from '@/lib/utils/validation'
import { requireAuth } from '@/lib/middleware/auth'
import { logger } from '@/lib/utils/logger'

export async function GET(request: Request) {
  const { data: auth, error } = await requireAuth()
  if (error) return error

  const supabase = await createClient()
  const { searchParams } = new URL(request.url)

  // Check if user is admin (site admin or tenant admin)
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('user_id', auth.user.id)
    .single<{ tenant_id: string; role: "admin" | "member" }>()

  const isTenantAdmin = tenantUser?.role === 'admin'

  if (!auth.isSiteAdmin && !isTenantAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Parse filters
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const { limit } = validatePagination(searchParams.get('limit'), null)
  const actionType = searchParams.get('action_type') || undefined
  const userId = searchParams.get('user_id') || undefined
  const fromDate = searchParams.get('from_date') || undefined
  const toDate = searchParams.get('to_date') || undefined
  const offset = (page - 1) * limit

  // Build query
  let query = supabase
    .from('audit_logs')
    .select('*, user:users!audit_logs_user_id_fkey(email, full_name)', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })

  // Filter by tenant if company admin
  if (!auth.isSiteAdmin && tenantUser?.tenant_id) {
    query = query.eq('tenant_id', tenantUser.tenant_id)
  }

  // Apply filters
  if (actionType) {
    query = query.eq('action', actionType)
  }

  if (userId) {
    query = query.eq('user_id', userId)
  }

  if (fromDate) {
    query = query.gte('created_at', fromDate)
  }

  if (toDate) {
    query = query.lte('created_at', toDate)
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  const { data: logs, error: queryError, count } = await query

  if (queryError) {
    logger.apiError('/api/audit-logs', 'GET', new Error('Failed to fetch audit logs'), {
      details: queryError,
    })
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  })
}
