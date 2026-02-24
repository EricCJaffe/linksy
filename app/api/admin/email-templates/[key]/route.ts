import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { isEmailTemplateKey } from '@/lib/email/template-registry'

export async function DELETE(
  _request: Request,
  { params }: { params: { key: string } }
) {
  const { error } = await requireSiteAdmin()
  if (error) return error

  if (!isEmailTemplateKey(params.key)) {
    return NextResponse.json({ error: 'Invalid template key' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { error: deleteError } = await supabase
    .from('linksy_email_templates')
    .delete()
    .eq('template_key', params.key)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
