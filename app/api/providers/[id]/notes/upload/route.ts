import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
]

const MAX_ATTACHMENT_SIZE_BYTES = 10 * 1024 * 1024

/**
 * POST /api/providers/[id]/notes/upload
 * Upload note attachment server-side to avoid storage RLS issues in client uploads.
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const { id: providerId } = params
  const supabase = await createServiceClient()

  if (!auth.isSiteAdmin && !auth.isTenantAdmin) {
    const { data: contact } = await supabase
      .from('linksy_provider_contacts')
      .select('id')
      .eq('provider_id', providerId)
      .eq('user_id', auth.user.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!contact) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const formData = await request.formData()
  const file = formData.get('file')

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'File is required' }, { status: 400 })
  }

  if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'File type not allowed. Supported: images, PDF, Word, Excel, CSV, text.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
    return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
  }

  const sanitized = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `note-attachments/${providerId}/${Date.now()}-${crypto.randomUUID()}-${sanitized}`

  const { data, error } = await supabase.storage
    .from('tenant-uploads')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    })

  if (error || !data) {
    return NextResponse.json(
      { error: error?.message || 'Failed to upload attachment' },
      { status: 500 }
    )
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('tenant-uploads').getPublicUrl(data.path)

  return NextResponse.json({ url: publicUrl })
}
