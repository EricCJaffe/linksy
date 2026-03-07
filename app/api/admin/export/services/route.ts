import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'
import { convertToCSV } from '@/lib/utils/csv'

/**
 * GET /api/admin/export/services
 * Export services/needs taxonomy to CSV with categories, synonyms, and provider counts
 */
export async function GET() {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const supabase = await createServiceClient()

  // Fetch categories with their needs
  const { data: categories, error: catError } = await supabase
    .from('linksy_need_categories')
    .select('id, name, slug, airs_code, sort_order, is_active')
    .order('sort_order', { ascending: true })

  if (catError) {
    return NextResponse.json({ error: catError.message }, { status: 500 })
  }

  // Fetch needs with provider counts
  const { data: needs, error: needsError } = await supabase
    .from('linksy_needs')
    .select('id, category_id, name, synonyms, is_active, linksy_provider_needs(id)')
    .order('name', { ascending: true })

  if (needsError) {
    return NextResponse.json({ error: needsError.message }, { status: 500 })
  }

  // Build category map
  const categoryMap = new Map<string, string>()
  for (const cat of categories || []) {
    categoryMap.set(cat.id, cat.name)
  }

  // Build export rows
  const rows = (needs || []).map((need: any) => ({
    category: categoryMap.get(need.category_id) || 'Unknown',
    service_name: need.name,
    synonyms: (need.synonyms || []).join('; '),
    provider_count: need.linksy_provider_needs?.length || 0,
    is_active: need.is_active ? 'Yes' : 'No',
  }))

  const csv = convertToCSV(rows, [
    { key: 'category', header: 'Category' },
    { key: 'service_name', header: 'Service Name' },
    { key: 'synonyms', header: 'Synonyms' },
    { key: 'provider_count', header: 'Provider Count' },
    { key: 'is_active', header: 'Active' },
  ])

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="services-taxonomy-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
