import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Public API for future directory listing functionality
// This can be used to expose certain tenant information publicly

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const slug = searchParams.get('slug')

  // For now, return basic tenant info by slug (if they have a public profile)
  if (slug) {
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, slug, branding')
      .eq('slug', slug)
      .single<{ id: string; name: string; slug: string; branding: any }>()

    if (error || !tenant) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Only return public information
    return NextResponse.json({
      name: tenant.name,
      slug: tenant.slug,
      branding: {
        logo_url: tenant.branding?.logo_url,
        primary_color: tenant.branding?.primary_color,
      },
    })
  }

  // Return list of public tenants (placeholder for future implementation)
  return NextResponse.json({
    message: 'Public directory API - implementation pending',
    version: '1.0',
  })
}
