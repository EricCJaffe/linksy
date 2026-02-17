import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * GET /api/admin/linksy/context-cards
 * Returns stats on how many providers have context cards generated
 */
export async function GET() {
  const auth = await requireSiteAdmin()
  if (auth instanceof NextResponse) return auth

  const supabase = await createServiceClient()
  const { data, error } = await supabase
    .from('linksy_providers')
    .select('id, name, llm_context_card, llm_context_card_generated_at', { count: 'exact' })
    .eq('is_active', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total = data?.length ?? 0
  const generated = data?.filter((p) => p.llm_context_card).length ?? 0

  return NextResponse.json({ total, generated, missing: total - generated })
}

/**
 * POST /api/admin/linksy/context-cards
 * Batch-generates LLM context cards for all active providers that need them.
 * Pass { force: true } to regenerate all, even ones already generated.
 */
export async function POST(request: Request) {
  const auth = await requireSiteAdmin()
  if (auth instanceof NextResponse) return auth

  const body = await request.json().catch(() => ({}))
  const force = body.force === true

  const supabase = await createServiceClient()

  // Fetch providers needing generation
  let query = supabase
    .from('linksy_providers')
    .select(`
      id, name, description, sector, phone, email, website,
      hours_of_operation, referral_type, referral_instructions,
      provider_needs:linksy_provider_needs(
        need:linksy_needs(id, name)
      ),
      locations:linksy_locations(
        city, state, postal_code, address_line1, is_primary
      )
    `)
    .eq('is_active', true)

  if (!force) {
    query = query.is('llm_context_card', null)
  }

  const { data: providers, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!providers || providers.length === 0) {
    return NextResponse.json({ updated: 0, message: 'All providers already have context cards.' })
  }

  // Generate cards and batch-update
  let updated = 0
  for (const provider of providers) {
    const card = buildContextCard(provider as any)
    const { error: updateError } = await supabase
      .from('linksy_providers')
      .update({
        llm_context_card: card,
        llm_context_card_generated_at: new Date().toISOString(),
      })
      .eq('id', provider.id)

    if (!updateError) updated++
  }

  return NextResponse.json({ updated, total: providers.length })
}

function buildContextCard(provider: {
  id: string
  name: string
  description: string | null
  sector: string
  phone: string | null
  email: string | null
  website: string | null
  hours_of_operation: string | null
  referral_type: string
  referral_instructions: string | null
  provider_needs: Array<{ need: { id: string; name: string } }>
  locations: Array<{ city: string | null; state: string | null; postal_code: string | null; address_line1: string | null; is_primary: boolean }>
}): string {
  const lines: string[] = []

  lines.push(`## ${provider.name}`)

  // Sector
  const sectorLabel: Record<string, string> = {
    nonprofit: 'Nonprofit',
    faith_based: 'Faith-based',
    government: 'Government',
    business: 'Business',
  }
  lines.push(`**Type:** ${sectorLabel[provider.sector] ?? provider.sector}`)

  // Services/Needs
  const needs = (provider.provider_needs ?? [])
    .map((pn: any) => pn.need?.name)
    .filter(Boolean)
  if (needs.length > 0) {
    lines.push(`**Services:** ${needs.join(', ')}`)
  }

  // Location
  const primaryLocation =
    provider.locations?.find((l: any) => l.is_primary) ?? provider.locations?.[0]
  if (primaryLocation) {
    const parts = [
      primaryLocation.address_line1,
      primaryLocation.city,
      primaryLocation.state,
      primaryLocation.postal_code,
    ].filter(Boolean)
    if (parts.length > 0) lines.push(`**Location:** ${parts.join(', ')}`)
  }

  // Contact
  if (provider.phone) lines.push(`**Phone:** ${provider.phone}`)
  if (provider.email) lines.push(`**Email:** ${provider.email}`)
  if (provider.website) lines.push(`**Website:** ${provider.website}`)

  // Hours
  if (provider.hours_of_operation) lines.push(`**Hours:** ${provider.hours_of_operation}`)

  // Referral
  if (provider.referral_type === 'contact_directly' && provider.referral_instructions) {
    lines.push(`**Referral:** Contact directly — ${provider.referral_instructions}`)
  } else if (provider.referral_type === 'standard') {
    lines.push(`**Referral:** Standard (no prior contact required)`)
  }

  // Description
  if (provider.description) {
    lines.push(``)
    lines.push(provider.description)
  }

  return lines.join('\n')
}
