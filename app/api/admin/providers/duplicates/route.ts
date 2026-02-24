import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireSiteAdmin } from '@/lib/middleware/auth'

/**
 * GET /api/admin/providers/duplicates
 * Find potential duplicate providers based on name similarity
 */
export async function GET(request: Request) {
  const { data: auth, error } = await requireSiteAdmin()
  if (error) return error

  const { searchParams } = new URL(request.url)
  const threshold = parseFloat(searchParams.get('threshold') || '0.7') // Similarity threshold
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)

  const supabase = await createServiceClient()

  // Fetch all providers with basic info
  const { data: providers, error: fetchError } = await supabase
    .from('linksy_providers')
    .select('id, name, slug, phone, email, website, sector, is_active, created_at')
    .order('name')
    .limit(limit * 2) // Get more to find duplicates

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!providers || providers.length === 0) {
    return NextResponse.json({ duplicates: [] })
  }

  // Find potential duplicates using simple string similarity
  // Group by similar names (case-insensitive, trimmed)
  const duplicateGroups: any[] = []
  const processed = new Set<string>()

  for (let i = 0; i < providers.length; i++) {
    const provider1 = providers[i]
    if (processed.has(provider1.id)) continue

    const group = [provider1]
    const name1 = provider1.name.toLowerCase().trim()

    for (let j = i + 1; j < providers.length; j++) {
      const provider2 = providers[j]
      if (processed.has(provider2.id)) continue

      const name2 = provider2.name.toLowerCase().trim()

      // Check for exact match or very similar names
      if (
        name1 === name2 ||
        name1.includes(name2) ||
        name2.includes(name1) ||
        calculateSimilarity(name1, name2) >= threshold
      ) {
        group.push(provider2)
        processed.add(provider2.id)
      }
    }

    if (group.length > 1) {
      // Fetch counts of associated data for each provider in the group
      const enrichedGroup = await Promise.all(
        group.map(async (p) => {
          const [
            { count: locationsCount },
            { count: contactsCount },
            { count: notesCount },
            { count: ticketsCount },
          ] = await Promise.all([
            supabase.from('linksy_locations').select('id', { count: 'exact', head: true }).eq('provider_id', p.id),
            supabase.from('linksy_provider_contacts').select('id', { count: 'exact', head: true }).eq('provider_id', p.id),
            supabase.from('linksy_provider_notes').select('id', { count: 'exact', head: true }).eq('provider_id', p.id),
            supabase.from('linksy_tickets').select('id', { count: 'exact', head: true }).eq('provider_id', p.id),
          ])

          return {
            ...p,
            counts: {
              locations: locationsCount || 0,
              contacts: contactsCount || 0,
              notes: notesCount || 0,
              tickets: ticketsCount || 0,
            },
          }
        })
      )

      duplicateGroups.push({
        providers: enrichedGroup,
        similarity: 'high', // You can enhance this with actual similarity scores
      })
      processed.add(provider1.id)
    }
  }

  return NextResponse.json({
    duplicates: duplicateGroups,
    total: duplicateGroups.length,
  })
}

// Simple Levenshtein-based similarity (0-1 scale)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2
  const shorter = str1.length > str2.length ? str2 : str1

  if (longer.length === 0) return 1.0

  const distance = levenshteinDistance(longer, shorter)
  return (longer.length - distance) / longer.length
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = []

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1 // deletion
        )
      }
    }
  }

  return matrix[str2.length][str1.length]
}
