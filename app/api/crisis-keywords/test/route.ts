import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const body = await request.json()
  const { message, site_id } = body

  if (!message || !site_id) {
    return NextResponse.json({ error: 'message and site_id are required' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data, error: rpcError } = await supabase.rpc('linksy_check_crisis', {
    p_message: message,
    p_site_id: site_id,
  })

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 })
  }

  const result = data && data.length > 0 ? data[0] : null
  return NextResponse.json({ detected: !!result, result })
}
