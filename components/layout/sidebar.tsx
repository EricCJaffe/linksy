'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Bell,
  Building2,
  LayoutDashboard,
  Tags,
  Ticket,
  Store,
  Search,
  HelpCircle,
  LifeBuoy,
  BarChart3,
  Calendar,
  AlertTriangle,
  Globe,
  BookOpen,
  FileText,
  Webhook,
  Mail,
  Merge,
  ClipboardCheck,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useCurrentTenant } from '@/lib/hooks/useCurrentTenant'
import { useProviderAccess } from '@/lib/hooks/useProviderAccess'
import { useSupportTickets } from '@/lib/hooks/useSupportTickets'
import { OrgSwitcher } from './org-switcher'

const mainNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: Home,
  },
  {
    title: 'Providers',
    href: '/dashboard/providers',
    icon: Building2,
  },
  {
    title: 'Contacts',
    href: '/dashboard/contacts',
    icon: Users,
  },
  {
    title: 'Services',
    href: '/dashboard/needs',
    icon: Tags,
  },
  {
    title: 'Referrals',
    href: '/dashboard/tickets',
    icon: Ticket,
  },
  {
    title: 'Reports',
    href: '/dashboard/reports',
    icon: BarChart3,
  },
  {
    title: 'Support Tickets',
    href: '/dashboard/support',
    icon: LifeBuoy,
  },
  {
    title: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
  },
  {
    title: 'Help & Docs',
    href: '/dashboard/help',
    icon: BookOpen,
  },
]

const adminNavItems = [
  {
    title: 'Admin Console',
    href: '/dashboard/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Public Search Preview',
    href: '/find-help',
    icon: Search,
  },
]

const providerNavItems = [
  {
    title: 'My Organization',
    href: '/dashboard/my-organization',
    icon: Store,
  },
  {
    title: 'My Referrals',
    href: '/dashboard/my-tickets',
    icon: Ticket,
  },
  {
    title: 'Submit Support Ticket',
    href: '/dashboard/support',
    icon: HelpCircle,
  },
  {
    title: 'Notifications',
    href: '/dashboard/notifications',
    icon: Bell,
  },
  {
    title: 'Help & Docs',
    href: '/dashboard/help',
    icon: BookOpen,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: user } = useCurrentUser()
  const { data: tenantData } = useCurrentTenant()
  const { data: providerAccess } = useProviderAccess()

  const isSiteAdmin = user?.profile?.role === 'site_admin'
  const isTenantAdmin = tenantData?.role === 'admin'
  const isProviderContact = providerAccess?.hasAccess === true

  // Fetch support ticket counts for badge
  const { data: supportData } = useSupportTickets({ limit: 200 })

  // Support ticket badge counts
  const supportOpenCount = supportData?.tickets?.filter(
    (t) => t.status === 'open'
  ).length ?? 0
  const supportInProgressCount = supportData?.tickets?.filter(
    (t) => t.status === 'in_progress'
  ).length ?? 0
  const supportBadgeCount = supportOpenCount + supportInProgressCount

  // Filter out tabs for non-site-admins and provider users
  // Only site admins should see the full provider directory and services management
  // Provider contacts use the "Provider Portal" section instead
  const filteredMainNav = mainNavItems.filter((item) => {
    // Hide Providers tab if NOT a site admin
    if (item.href === '/dashboard/providers' && !isSiteAdmin) {
      return false
    }
    // Hide Contacts tab if NOT a site admin
    if (item.href === '/dashboard/contacts' && !isSiteAdmin) {
      return false
    }
    // Hide Services tab if NOT a site admin
    if (item.href === '/dashboard/needs' && !isSiteAdmin) {
      return false
    }
    // Hide Referrals tab for provider users (they use "My Referrals" instead)
    if (item.href === '/dashboard/tickets' && !isSiteAdmin && isProviderContact) {
      return false
    }
    // Hide Notifications and Help for provider users (moved to Provider Portal section)
    if ((item.href === '/dashboard/notifications' || item.href === '/dashboard/help') && !isSiteAdmin && isProviderContact) {
      return false
    }
    // Hide Support Tickets for provider users (they use the Provider Portal version)
    if (item.href === '/dashboard/support' && !isSiteAdmin && isProviderContact) {
      return false
    }
    return true
  })

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="p-4">
        <OrgSwitcher />
      </div>

      <nav className="flex-1 space-y-6 p-4">
        <div className="space-y-1">
          {filteredMainNav.map((item) => {
            const isActive = item.href === '/dashboard'
              ? pathname === item.href
              : pathname.startsWith(item.href)
            const isSupportItem = item.href === '/dashboard/support'

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.title}</span>
                {isSupportItem && supportBadgeCount > 0 && (
                  <span
                    className={cn(
                      'ml-auto inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-semibold',
                      isActive
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : supportOpenCount > 0
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                    )}
                  >
                    {supportBadgeCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {(isTenantAdmin && !isSiteAdmin) && (
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">
              Company
            </p>
            <Link
              href="/dashboard/company"
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                pathname.startsWith('/dashboard/company')
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Building2 className="h-4 w-4" />
              Company Admin
            </Link>
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

        {!isSiteAdmin && isProviderContact && (
          <div className="space-y-1">
            <p className="px-3 text-xs font-semibold uppercase text-muted-foreground">
              Provider Portal
            </p>
            {providerNavItems.map((item) => (
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
