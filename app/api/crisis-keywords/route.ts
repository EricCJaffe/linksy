import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

export async function GET(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const site_id = searchParams.get('site_id')

  const supabase = await createServiceClient()
  let query = supabase
    .from('linksy_crisis_keywords')
    .select('*')
    .order('crisis_type', { ascending: true })
    .order('severity', { ascending: false })
    .order('keyword', { ascending: true })

  if (site_id) {
    query = query.eq('site_id', site_id)
  }

  const { data, error: queryError } = await query

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const body = await request.json()
  const { site_id, keyword, crisis_type, severity, response_template, emergency_resources } = body

  if (!site_id || !keyword || !crisis_type || !severity) {
    return NextResponse.json(
      { error: 'site_id, keyword, crisis_type, and severity are required' },
      { status: 400 }
    )
  }

  const validCrisisTypes = ['suicide', 'domestic_violence', 'trafficking', 'child_abuse']
  const validSeverities = ['low', 'medium', 'high', 'critical']

  if (!validCrisisTypes.includes(crisis_type)) {
    return NextResponse.json({ error: 'Invalid crisis_type' }, { status: 400 })
  }
  if (!validSeverities.includes(severity)) {
    return NextResponse.json({ error: 'Invalid severity' }, { status: 400 })
  }

  const supabase = await createServiceClient()
  const { data, error: insertError } = await supabase
    .from('linksy_crisis_keywords')
    .insert({
      site_id,
      keyword: keyword.trim().toLowerCase(),
      crisis_type,
      severity,
      response_template: response_template || null,
      emergency_resources: emergency_resources || [],
      is_active: true,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
