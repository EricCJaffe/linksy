import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      users: [],
      modules: [],
      settings: [],
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

  // Search users in the tenant - SERVER-SIDE FILTERING
  // Use ilike for case-insensitive pattern matching in the database
  const { data: users } = await supabase
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
    .limit(10)

  const filteredUsers = users || []

  // Search modules enabled for the tenant - SERVER-SIDE FILTERING
  const { data: modules } = await supabase
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
    .limit(10)

  const filteredModules = modules || []

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

  return NextResponse.json({
    users: formattedUsers,
    modules: formattedModules,
    settings: formattedSettings,
    total: formattedUsers.length + formattedModules.length + formattedSettings.length,
  })
}
