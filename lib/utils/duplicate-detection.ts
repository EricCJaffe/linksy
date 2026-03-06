import type { SupabaseClient } from '@supabase/supabase-js'

export interface DuplicateCheckResult {
  blocked: boolean
  flagType: 'case_a' | 'case_b' | 'case_c' | null
  message: string | null
  relatedTickets: Array<{ id: string; ticket_number: string; created_at: string }>
}

/**
 * Check for duplicate referrals per TASK-029 rules:
 * - Case B: Same client + provider + service + same day → BLOCK
 * - Case A: Same client + 5+ providers + same service + same day → FLAG (allow but warn)
 * - Case C: Same client + same provider on consecutive days → FLAG (allow but warn)
 *
 * Test referrals are exempt (caller should skip this function for test referrals).
 */
export async function checkDuplicateReferral(
  supabase: SupabaseClient,
  params: {
    client_email?: string | null
    client_phone?: string | null
    provider_id: string
    need_id?: string | null
  }
): Promise<DuplicateCheckResult> {
  const { client_email, client_phone, provider_id, need_id } = params

  // Need at least one client identifier
  if (!client_email && !client_phone) {
    return { blocked: false, flagType: null, message: null, relatedTickets: [] }
  }

  // Build client identity OR filter
  const clientOrConditions: string[] = []
  if (client_email) clientOrConditions.push(`client_email.eq.${client_email}`)
  if (client_phone) clientOrConditions.push(`client_phone.eq.${client_phone}`)
  const clientFilter = clientOrConditions.join(',')

  // Get start of today (UTC)
  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)
  const todayISO = todayStart.toISOString()

  // Case B: Same client + same provider + same service + same day → BLOCK
  {
    let query = supabase
      .from('linksy_tickets')
      .select('id, ticket_number, created_at')
      .eq('provider_id', provider_id)
      .gte('created_at', todayISO)
      .or(clientFilter)

    if (need_id) {
      query = query.eq('need_id', need_id)
    }

    const { data: sameDayDups } = await query.limit(5)
    if (sameDayDups && sameDayDups.length > 0) {
      return {
        blocked: true,
        flagType: 'case_b',
        message: `A referral for this client and provider already exists today (${sameDayDups[0].ticket_number}). Use force: true to override.`,
        relatedTickets: sameDayDups,
      }
    }
  }

  // Case A: Same client + 5+ providers + same service + same day → FLAG
  if (need_id) {
    let query = supabase
      .from('linksy_tickets')
      .select('id, ticket_number, provider_id, created_at')
      .eq('need_id', need_id)
      .gte('created_at', todayISO)
      .or(clientFilter)

    const { data: sameDayServiceTickets } = await query.limit(50)
    if (sameDayServiceTickets) {
      const uniqueProviders = new Set(sameDayServiceTickets.map(t => t.provider_id))
      // Current request adds another provider (if not already in the set)
      uniqueProviders.add(provider_id)
      if (uniqueProviders.size >= 5) {
        return {
          blocked: false,
          flagType: 'case_a',
          message: `This client has referrals to ${uniqueProviders.size} providers for the same service today. Flagged for review.`,
          relatedTickets: sameDayServiceTickets.slice(0, 5),
        }
      }
    }
  }

  // Case C: Same client + same provider on consecutive day → FLAG
  {
    const yesterdayStart = new Date(todayStart)
    yesterdayStart.setUTCDate(yesterdayStart.getUTCDate() - 1)
    const yesterdayISO = yesterdayStart.toISOString()

    const { data: yesterdayTickets } = await supabase
      .from('linksy_tickets')
      .select('id, ticket_number, created_at')
      .eq('provider_id', provider_id)
      .gte('created_at', yesterdayISO)
      .lt('created_at', todayISO)
      .or(clientFilter)
      .limit(5)

    if (yesterdayTickets && yesterdayTickets.length > 0) {
      return {
        blocked: false,
        flagType: 'case_c',
        message: `This client had a referral to this provider yesterday (${yesterdayTickets[0].ticket_number}). Flagged for review.`,
        relatedTickets: yesterdayTickets,
      }
    }
  }

  return { blocked: false, flagType: null, message: null, relatedTickets: [] }
}
