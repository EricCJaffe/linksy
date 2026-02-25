'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Bell,
  Building2,
  LayoutDashboard,
  Briefcase,
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
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useCurrentTenant } from '@/lib/hooks/useCurrentTenant'
import { useProviderAccess } from '@/lib/hooks/useProviderAccess'
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
    title: 'Needs',
    href: '/dashboard/needs',
    icon: Tags,
  },
  {
    title: 'Referrals',
    href: '/dashboard/tickets',
    icon: Ticket,
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
  {
    title: 'Reports',
    href: '/dashboard/admin/reports',
    icon: BarChart3,
  },
  {
    title: 'Events',
    href: '/dashboard/admin/events',
    icon: Calendar,
  },
  {
    title: 'Support Tickets',
    href: '/dashboard/admin/support',
    icon: LifeBuoy,
  },
  {
    title: 'Crisis Detection',
    href: '/dashboard/admin/crisis',
    icon: AlertTriangle,
  },
  {
    title: 'Widget Hosts',
    href: '/dashboard/admin/hosts',
    icon: Globe,
  },
  {
    title: 'Docs Manager',
    href: '/dashboard/admin/docs',
    icon: FileText,
  },
  {
    title: 'Webhooks',
    href: '/dashboard/admin/webhooks',
    icon: Webhook,
  },
  {
    title: 'Email Templates',
    href: '/dashboard/admin/email-templates',
    icon: Mail,
  },
  {
    title: 'Merge Providers',
    href: '/dashboard/admin/merge-providers',
    icon: Merge,
  },
  {
    title: 'Merge Contacts',
    href: '/dashboard/admin/merge-contacts',
    icon: Merge,
  },
  {
    title: 'Review Imports',
    href: '/dashboard/admin/review-imports',
    icon: ClipboardCheck,
  },
  {
    title: 'Provider Portal Preview',
    href: '/dashboard/my-organization',
    icon: Store,
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

  // Filter out tabs for non-site-admins and provider users
  // Only site admins should see the full provider directory and needs management
  // Provider contacts use the "Provider Portal" section instead
  const filteredMainNav = mainNavItems.filter((item) => {
    // Hide Providers tab if NOT a site admin
    if (item.href === '/dashboard/providers' && !isSiteAdmin) {
      return false
    }
    // Hide Needs tab if NOT a site admin
    if (item.href === '/dashboard/needs' && !isSiteAdmin) {
      return false
    }
    // Hide Referrals tab for provider users (they use "My Referrals" instead)
    if (item.href === '/dashboard/tickets' && !isSiteAdmin && (isProviderContact || !tenantData)) {
      return false
    }
    // Hide Notifications and Help for provider users (moved to Provider Portal section)
    if ((item.href === '/dashboard/notifications' || item.href === '/dashboard/help') && !isSiteAdmin && (isProviderContact || !tenantData)) {
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
          {filteredMainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                (item.href === '/dashboard'
                  ? pathname === item.href
                  : pathname.startsWith(item.href))
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

        {!isSiteAdmin && (isProviderContact || !tenantData) && (
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
