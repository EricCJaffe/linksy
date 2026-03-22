import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!query || query.trim().length === 0) {
    return NextResponse.json({
      providers: [],
      users: [],
      modules: [],
      settings: [],
      tickets: [],
      contacts: [],
      total: 0,
    })
  }

  // Sanitize search term to prevent injection attacks
  // Limit length and remove special SQL characters
  const sanitizedQuery = query
    .trim()
    .slice(0, 100) // Limit to 100 characters
    .replace(/[%_]/g, '') // Remove SQL wildcard characters that could be abused

  // Get current tenant
  const { data: tenantUser } = await supabase
    .from('tenant_users')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .single<{ tenant_id: string; role: "admin" | "member" }>()

  if (!tenantUser) {
    return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
  }

  const tenantId = tenantUser.tenant_id
  const serviceSupabase = await createServiceClient()

  // Run all searches in parallel
  const [usersResult, modulesResult, ticketsResult, contactsResult, providersResult] = await Promise.all([
    // Search users in the tenant
    supabase
      .from('tenant_users')
      .select(
        `
        user_id,
        role,
        user:users!inner(
          id,
          email,
          full_name,
          avatar_url
        )
      `
      )
      .eq('tenant_id', tenantId)
      .or(`email.ilike.%${sanitizedQuery}%,full_name.ilike.%${sanitizedQuery}%`, { foreignTable: 'users' })
      .limit(10),

    // Search modules enabled for the tenant
    supabase
      .from('tenant_modules')
      .select(
        `
        *,
        module:modules!inner(
          id,
          name,
          slug,
          description
        )
      `
      )
      .eq('tenant_id', tenantId)
      .eq('is_enabled', true)
      .or(`name.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`, { foreignTable: 'modules' })
      .limit(10),

    // Search tickets by client name, email, phone, or ticket number
    serviceSupabase
      .from('linksy_tickets')
      .select('id, ticket_number, client_name, client_email, client_phone, status, created_at')
      .or(
        `client_name.ilike.%${sanitizedQuery}%,client_email.ilike.%${sanitizedQuery}%,client_phone.ilike.%${sanitizedQuery}%,ticket_number.ilike.%${sanitizedQuery}%`
      )
      .order('created_at', { ascending: false })
      .limit(10),

    // Search provider contacts by name, email, or phone
    serviceSupabase
      .from('linksy_provider_contacts')
      .select('id, user_id, provider_id, provider_role, phone, status, linksy_providers(name)')
      .eq('status', 'active')
      .limit(50),

    // Search providers by name, phone, or email
    serviceSupabase
      .from('linksy_providers')
      .select('id, name, slug, phone, email, provider_status, sector')
      .or(
        `name.ilike.%${sanitizedQuery}%,phone.ilike.%${sanitizedQuery}%,email.ilike.%${sanitizedQuery}%`
      )
      .eq('is_active', true)
      .order('name')
      .limit(10),
  ])

  const filteredUsers = usersResult.data || []
  const filteredModules = modulesResult.data || []
  const tickets = ticketsResult.data || []

  // Filter contacts in app layer since we need to join with auth users for name/email
  // Also match contacts by their phone field directly
  const rawContacts = contactsResult.data || []
  const providers = providersResult.data || []
  let filteredContacts: any[] = []
  if (rawContacts.length > 0) {
    const lowerQuery = sanitizedQuery.toLowerCase()

    // Contacts that match by phone directly on the contact record
    const phoneMatchedContacts = rawContacts.filter(
      (c: any) => c.phone && c.phone.toLowerCase().includes(lowerQuery)
    )
    const phoneMatchedUserIds = new Set(phoneMatchedContacts.map((c: any) => c.user_id))

    // Get user details for all contacts to search by name/email
    const userIds = Array.from(new Set(rawContacts.map((c: any) => c.user_id).filter(Boolean)))
    const { data: contactUsers } = await serviceSupabase
      .from('users')
      .select('id, email, full_name')
      .in('id', userIds)

    const userMap = new Map((contactUsers || []).map((u: any) => [u.id, u]))

    // Find users matching by name or email
    const nameEmailMatchedUserIds = new Set(
      (contactUsers || [])
        .filter(
          (u: any) =>
            u.email?.toLowerCase().includes(lowerQuery) ||
            u.full_name?.toLowerCase().includes(lowerQuery)
        )
        .map((u: any) => u.id)
    )

    // Combine phone matches and name/email matches
    filteredContacts = rawContacts
      .filter(
        (c: any) =>
          phoneMatchedUserIds.has(c.user_id) || nameEmailMatchedUserIds.has(c.user_id)
      )
      .slice(0, 10)
      .map((c: any) => ({
        ...c,
        _user: userMap.get(c.user_id),
      }))
  }

  // Search settings/pages (static list)
  const settingsPages = [
    {
      id: 'profile',
      title: 'Profile Settings',
      description: 'Manage your personal information and preferences',
      url: '/settings/profile',
      icon: 'user',
    },
    {
      id: 'company',
      title: 'Company Settings',
      description: 'Manage organization details',
      url: '/settings/company',
      icon: 'building',
    },
    {
      id: 'branding',
      title: 'Branding',
      description: 'Customize appearance and branding',
      url: '/settings/branding',
      icon: 'palette',
    },
    {
      id: 'modules',
      title: 'Modules',
      description: 'Enable or disable features',
      url: '/settings/modules',
      icon: 'package',
    },
    {
      id: 'users',
      title: 'User Management',
      description: 'Manage team members and invitations',
      url: '/settings/users',
      icon: 'users',
    },
  ]

  const filteredSettings = settingsPages.filter(
    (page) =>
      page.title.toLowerCase().includes(sanitizedQuery.toLowerCase()) ||
      page.description.toLowerCase().includes(sanitizedQuery.toLowerCase())
  )

  // Format results
  const formattedUsers = filteredUsers.slice(0, 10).map((tu: any) => ({
    id: tu.user_id,
    type: 'user',
    title: tu.user.profile?.full_name || tu.user.email,
    subtitle: tu.user.email,
    description: tu.role,
    url: '/settings/users',
    icon: 'user',
    metadata: {
      role: tu.role,
      avatar_url: tu.user.profile?.avatar_url,
    },
  }))

  const formattedModules = filteredModules.slice(0, 10).map((tm: any) => ({
    id: tm.module.id,
    type: 'module',
    title: tm.module.name,
    subtitle: tm.module.slug,
    description: tm.module.description || '',
    url: '/settings/modules',
    icon: 'package',
    metadata: {
      slug: tm.module.slug,
    },
  }))

  const formattedSettings = filteredSettings.slice(0, 10).map((page) => ({
    id: page.id,
    type: 'setting',
    title: page.title,
    subtitle: '',
    description: page.description,
    url: page.url,
    icon: page.icon,
    metadata: {},
  }))

  const formattedTickets = tickets.map((t: any) => ({
    id: t.id,
    type: 'ticket',
    title: t.ticket_number,
    subtitle: t.client_name || t.client_email || t.client_phone || '',
    description: t.status,
    url: `/dashboard/tickets/${t.id}`,
    icon: 'ticket',
    metadata: {
      status: t.status,
      client_name: t.client_name,
      created_at: t.created_at,
    },
  }))

  const formattedContacts = filteredContacts.map((c: any) => ({
    id: c.id,
    type: 'contact',
    title: c._user?.full_name || c._user?.email || 'Unknown',
    subtitle: c._user?.email || '',
    description: (c.linksy_providers as any)?.name || '',
    url: c.provider_id ? `/dashboard/providers/${c.provider_id}` : '/dashboard/contacts',
    icon: 'contact',
    metadata: {
      provider_role: c.provider_role,
      provider_id: c.provider_id,
      phone: c.phone,
    },
  }))

  const formattedProviders = providers.map((p: any) => ({
    id: p.id,
    type: 'provider',
    title: p.name,
    subtitle: [p.phone, p.email].filter(Boolean).join(' · '),
    description: `${p.sector} · ${p.provider_status}`,
    url: `/dashboard/providers/${p.id}`,
    icon: 'building',
    metadata: {
      provider_status: p.provider_status,
      sector: p.sector,
    },
  }))

  return NextResponse.json({
    providers: formattedProviders,
    users: formattedUsers,
    modules: formattedModules,
    settings: formattedSettings,
    tickets: formattedTickets,
    contacts: formattedContacts,
    total:
      formattedProviders.length +
      formattedUsers.length +
      formattedModules.length +
      formattedSettings.length +
      formattedTickets.length +
      formattedContacts.length,
  })
}
