import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { listFiles } from '@/lib/storage/files'
import { validatePagination, sanitizeError } from '@/lib/utils/validation'
import { logger } from '@/lib/utils/logger'

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
      .select('tenant_id')
      .eq('user_id', user.id)
      .single<{ tenant_id: string }>()

    if (!tenantUser) {
      return NextResponse.json(
        { error: 'User not associated with a tenant' },
        { status: 403 }
      )
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const moduleId = searchParams.get('moduleId') || undefined
    const folderPath = searchParams.get('folderPath') || undefined
    const { limit, offset } = validatePagination(
      searchParams.get('limit'),
      searchParams.get('offset')
    )

    // List files
    const { files, total } = await listFiles({
      tenantId: tenantUser.tenant_id,
      moduleId,
      folderPath,
      limit,
      offset,
    })

    return NextResponse.json({
      files,
      pagination: {
        limit,
        offset,
        total,
      },
    })
  } catch (error) {
    logger.apiError('/api/files', 'GET', error instanceof Error ? error : new Error('Failed to list files'))
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to list files',
      },
      { status: 500 }
    )
  }
}
