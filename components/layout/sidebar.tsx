'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Bell,
  Building2,
  LayoutDashboard,
  Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useCurrentTenant } from '@/lib/hooks/useCurrentTenant'
import { OrgSwitcher } from './org-switcher'

const mainNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
  },
]

const companyNavItems = [
  {
    title: 'Company Admin',
    href: '/dashboard/company',
    icon: Briefcase,
  },
]

const adminNavItems = [
  {
    title: 'Admin Console',
    href: '/dashboard/admin',
    icon: LayoutDashboard,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: user } = useCurrentUser()
  const { data: tenantData } = useCurrentTenant()

  const isSiteAdmin = user?.profile?.role === 'site_admin'
  const isTenantAdmin = tenantData?.role === 'admin'

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="p-4">
        <OrgSwitcher />
      </div>

      <nav className="flex-1 space-y-6 p-4">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname === item.href
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </div>

        {(isTenantAdmin || isSiteAdmin) && (
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">
              Company
            </p>
            {companyNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname.startsWith(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            ))}
          </div>
        )}

        {isSiteAdmin && (
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">
              Admin
            </p>
            {adminNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  pathname.startsWith(item.href)
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.title}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </aside>
  )
}
