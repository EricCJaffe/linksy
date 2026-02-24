import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/middleware/auth'

/**
 * GET /api/stats/my-provider
 * Returns stats for provider user's organization and personal referrals
 */
export async function GET() {
  const { data: auth, error: authError } = await requireAuth()
  if (authError) return authError

  const supabase = await createServiceClient()

  // Get user's provider access
  const { data: providerContacts, error: contactError } = await supabase
    .from('linksy_provider_contacts')
    .select(`
      id,
      provider_id,
      provider_role,
      provider:linksy_providers(
        id,
        name,
        slug,
        phone,
        email,
        website,
        address,
        city,
        state,
        zip,
        description,
        is_active,
        accepting_referrals
      )
    `)
    .eq('user_id', auth.user.id)
    .eq('status', 'active')
    .limit(1)
    .single()

  if (contactError || !providerContacts) {
    return NextResponse.json({
      hasAccess: false,
      provider: null,
      orgStats: null,
      personalStats: null,
    })
  }

  const provider = (providerContacts as any).provider
  const providerId = providerContacts.provider_id

  // Get organization-wide referral stats
  const { data: orgReferrals, error: orgError } = await supabase
    .from('linksy_tickets')
    .select('id, status, created_at')
    .eq('provider_id', providerId)

  const orgStats = {
    total: orgReferrals?.length || 0,
    pending: orgReferrals?.filter(t => t.status === 'pending').length || 0,
    in_progress: orgReferrals?.filter(t => t.status === 'in_progress').length || 0,
    resolved: orgReferrals?.filter(t => t.status === 'resolved').length || 0,
    closed: orgReferrals?.filter(t => t.status === 'closed').length || 0,
  }

  // Get personal referral stats (assigned to this user)
  const { data: personalReferrals, error: personalError } = await supabase
    .from('linksy_tickets')
    .select('id, status, created_at')
    .eq('provider_id', providerId)
    .eq('assigned_to', auth.user.id)

  const personalStats = {
    total: personalReferrals?.length || 0,
    pending: personalReferrals?.filter(t => t.status === 'pending').length || 0,
    in_progress: personalReferrals?.filter(t => t.status === 'in_progress').length || 0,
    resolved: personalReferrals?.filter(t => t.status === 'resolved').length || 0,
    closed: personalReferrals?.filter(t => t.status === 'closed').length || 0,
  }

  // Count recent (this month)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const personalThisMonth = personalReferrals?.filter(
    t => new Date(t.created_at) >= startOfMonth
  ).length || 0

  const orgThisMonth = orgReferrals?.filter(
    t => new Date(t.created_at) >= startOfMonth
  ).length || 0

  return NextResponse.json({
    hasAccess: true,
    provider: {
      ...provider,
      role: providerContacts.provider_role,
    },
    orgStats: {
      ...orgStats,
      thisMonth: orgThisMonth,
    },
    personalStats: {
      ...personalStats,
      thisMonth: personalThisMonth,
    },
  })
}
