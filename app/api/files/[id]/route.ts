import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteFile, getFile, moveFile } from '@/lib/storage/files'
import { logger } from '@/lib/utils/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Get file with tenant verification
    const { metadata, downloadUrl } = await getFile(params.id)

    // Verify user has access to this file
    if (metadata.tenant_id !== tenantUser.tenant_id) {
      return NextResponse.json(
        { error: 'Access denied to this file' },
        { status: 403 }
      )
    }

    // If file is not shared, verify it belongs to the user
    if (!metadata.is_shared && metadata.uploaded_by !== user.id) {
      return NextResponse.json(
        { error: 'Access denied to this file' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      file: metadata,
      downloadUrl,
    })
  } catch (error) {
    logger.apiError(
      `/api/files/${params.id}`,
      'GET',
      error instanceof Error ? error : new Error('Failed to fetch file')
    )
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to fetch file',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      .single<{ tenant_id: string; role: "admin" | "member" }>()

    if (!tenantUser) {
      return NextResponse.json(
        { error: 'User not associated with a tenant' },
        { status: 403 }
      )
    }

    // Get file metadata to check permissions
    const { data: file } = await supabase
      .from('files')
      .select('tenant_id, uploaded_by')
      .eq('id', params.id)
      .single<{ tenant_id: string; uploaded_by: string }>()

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Verify user has access to this file
    if (file.tenant_id !== tenantUser.tenant_id) {
      return NextResponse.json(
        { error: 'Access denied to this file' },
        { status: 403 }
      )
    }

    // Only file owner or admin can delete
    const isAdmin = tenantUser.role === 'admin'
    if (!isAdmin && file.uploaded_by !== user.id) {
      return NextResponse.json(
        { error: 'Only file owner or admin can delete files' },
        { status: 403 }
      )
    }

    // Delete the file
    await deleteFile(params.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.apiError(
      `/api/files/${params.id}`,
      'DELETE',
      error instanceof Error ? error : new Error('Failed to delete file')
    )
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete file',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
      .single<{ tenant_id: string; role: "admin" | "member" }>()

    if (!tenantUser) {
      return NextResponse.json(
        { error: 'User not associated with a tenant' },
        { status: 403 }
      )
    }

    // Get file metadata to check permissions
    const { data: file } = await supabase
      .from('files')
      .select('tenant_id, uploaded_by')
      .eq('id', params.id)
      .single<{ tenant_id: string; uploaded_by: string }>()

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // Verify user has access to this file
    if (file.tenant_id !== tenantUser.tenant_id) {
      return NextResponse.json(
        { error: 'Access denied to this file' },
        { status: 403 }
      )
    }

    // Only file owner or admin can update
    const isAdmin = tenantUser.role === 'admin'
    if (!isAdmin && file.uploaded_by !== user.id) {
      return NextResponse.json(
        { error: 'Only file owner or admin can update files' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { folderPath } = body

    if (folderPath !== undefined) {
      await moveFile(params.id, folderPath)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.apiError(
      `/api/files/${params.id}`,
      'PATCH',
      error instanceof Error ? error : new Error('Failed to update file')
    )
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update file',
      },
      { status: 500 }
    )
  }
}
