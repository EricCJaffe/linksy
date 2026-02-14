import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validatePagination } from '@/lib/utils/validation'
import { logger } from '@/lib/utils/logger'

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get pagination params
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const { limit } = validatePagination(searchParams.get('limit'), null)
  const unreadOnly = searchParams.get('unread_only') === 'true'
  const offset = (page - 1) * limit

  // Build query
  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (unreadOnly) {
    query = query.is('read_at', null)
  }

  const { data: notifications, error, count } = await query

  if (error) {
    logger.apiError('/api/notifications', 'GET', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    notifications,
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { notification_ids, mark_all } = body

  if (mark_all) {
    // Mark all notifications as read
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null)

    if (error) {
      logger.apiError('/api/notifications', 'PATCH', error as Error, { action: 'mark_all_read' })
      return NextResponse.json(
        { error: 'Failed to mark notifications as read' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  }

  if (!notification_ids || !Array.isArray(notification_ids)) {
    return NextResponse.json(
      { error: 'notification_ids array is required' },
      { status: 400 }
    )
  }

  // Mark specific notifications as read
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .in('id', notification_ids)
    .eq('user_id', user.id)

  if (error) {
    logger.apiError('/api/notifications', 'PATCH', error as Error, { action: 'mark_read', notification_ids })
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
