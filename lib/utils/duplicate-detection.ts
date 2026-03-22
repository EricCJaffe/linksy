import type { SupabaseClient } from '@supabase/supabase-js'

export interface DuplicateCheckResult {
  blocked: boolean
  flagType: 'case_a' | 'case_b' | 'case_c' | 'case_d' | null
  message: string | null
  relatedTickets: Array<{ id: string; ticket_number: string; created_at: string }>
}

/**
 * Check for duplicate referrals per TASK-029 rules:
 * - Case B: Same client + provider + service + within 30 days → BLOCK
 * - Case A: Same client + 5+ providers + same service + same day → FLAG (allow but warn)
 * - Case C: Same client + same provider on consecutive days → FLAG (allow but warn)
 * - Case D: Same client + same service category + same week → FLAG (allow but warn)
 *
 * Note: Same person + different need + same provider = always OK (no dedup).
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

  // Case B: Same client + same provider + same service + within 30 days → BLOCK
  {
    const thirtyDaysAgo = new Date(todayStart)
    thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30)
    const thirtyDaysAgoISO = thirtyDaysAgo.toISOString()

    let query = supabase
      .from('linksy_tickets')
      .select('id, ticket_number, created_at')
      .eq('provider_id', provider_id)
      .gte('created_at', thirtyDaysAgoISO)
      .or(clientFilter)

    if (need_id) {
      query = query.eq('need_id', need_id)
    }

    const { data: recentDups } = await query.limit(5)
    if (recentDups && recentDups.length > 0) {
      return {
        blocked: true,
        flagType: 'case_b',
        message: `A referral for this client to this provider for the same service already exists within the last 30 days (${recentDups[0].ticket_number}). Please wait or contact us if you need further assistance.`,
        relatedTickets: recentDups,
      }
    }
  }

  // Case A: Same client + 5+ providers + same service + same day → FLAG
  if (need_id) {
    const query = supabase
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

  // Case D: Same client + same service category + same week → FLAG
  // If the client already has a referral for any need within the same category
  // this week, flag it for review (they may be shopping around within a category).
  if (need_id) {
    // Look up the category for the requested need
    const { data: needData } = await supabase
      .from('linksy_needs')
      .select('category_id')
      .eq('id', need_id)
      .single()

    if (needData?.category_id) {
      // Get start of current week (Monday UTC)
      const weekStart = new Date(todayStart)
      const dayOfWeek = weekStart.getUTCDay() // 0=Sun, 1=Mon, ...
      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
      weekStart.setUTCDate(weekStart.getUTCDate() - daysFromMonday)
      const weekStartISO = weekStart.toISOString()

      // Find all needs in the same category
      const { data: categoryNeeds } = await supabase
        .from('linksy_needs')
        .select('id')
        .eq('category_id', needData.category_id)

      if (categoryNeeds && categoryNeeds.length > 1) {
        const categoryNeedIds = categoryNeeds.map(n => n.id)

        // Check for tickets this week with any need in the same category
        const { data: sameCategoryTickets } = await supabase
          .from('linksy_tickets')
          .select('id, ticket_number, created_at')
          .in('need_id', categoryNeedIds)
          .gte('created_at', weekStartISO)
          .or(clientFilter)
          .limit(5)

        if (sameCategoryTickets && sameCategoryTickets.length > 0) {
          return {
            blocked: false,
            flagType: 'case_d',
            message: `This client already has a referral for a similar service category this week (${sameCategoryTickets[0].ticket_number}). Flagged for review.`,
            relatedTickets: sameCategoryTickets,
          }
        }
      }
    }
  }

  return { blocked: false, flagType: null, message: null, relatedTickets: [] }
}
