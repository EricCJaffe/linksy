import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logger } from '@/lib/utils/logger'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { read } = body

  // Toggle read status
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: read ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    logger.apiError(`/api/notifications/${id}`, 'PATCH', error as Error, { read })
    return NextResponse.json(
      { error: 'Failed to update notification' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { id } = await params

  // Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Delete notification
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    logger.apiError(`/api/notifications/${id}`, 'DELETE', error as Error)
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true })
}
