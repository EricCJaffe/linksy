import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadFile } from '@/lib/storage/files'
import { validateFileType, isExtensionAllowed } from '@/lib/utils/file-validation'
import { logger } from '@/lib/utils/logger'

export async function POST(request: NextRequest) {
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
    const { data: tenantUser, error: tenantError } = await supabase
      .from('tenant_users')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single<{ tenant_id: string; role: "admin" | "member" }>()

    if (tenantError || !tenantUser) {
      return NextResponse.json(
        { error: 'User not associated with a tenant' },
        { status: 403 }
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const moduleId = formData.get('moduleId') as string | null
    const isShared = formData.get('isShared') === 'true'
    const folderPath = formData.get('folderPath') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size (50MB limit)
    const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 50MB limit' },
        { status: 400 }
      )
    }

    // Validate file extension
    if (!isExtensionAllowed(file.name)) {
      return NextResponse.json(
        { error: 'File type not allowed. Allowed types: images, documents, text files, archives, and media.' },
        { status: 400 }
      )
    }

    // Validate file type using magic bytes (prevents file type spoofing)
    const fileValidation = await validateFileType(file)
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error || 'Invalid file type detected' },
        { status: 400 }
      )
    }

    // Validate moduleId belongs to user's tenant (if provided)
    if (moduleId && moduleId !== 'general') {
      const { data: tenantModule, error: moduleError } = await supabase
        .from('tenant_modules')
        .select('id')
        .eq('tenant_id', tenantUser.tenant_id)
        .eq('module_id', moduleId)
        .maybeSingle()

      if (moduleError || !tenantModule) {
        return NextResponse.json(
          { error: 'Invalid module or module not enabled for your organization' },
          { status: 403 }
        )
      }
    }

    // Upload file
    const fileMetadata = await uploadFile({
      file,
      tenantId: tenantUser.tenant_id,
      moduleId: moduleId || 'general',
      isShared,
      folderPath: folderPath || undefined,
    })

    return NextResponse.json({
      success: true,
      file: fileMetadata,
    })
  } catch (error) {
    logger.apiError('/api/files/upload', 'POST', error instanceof Error ? error : new Error('Unknown error'), {
      fileName: (error as any)?.fileName,
    })
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to upload file',
      },
      { status: 500 }
    )
  }
}
