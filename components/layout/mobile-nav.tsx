'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Bell, Settings, Users } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useCurrentTenant } from '@/lib/hooks/useCurrentTenant'

const mainNavItems = [
  { title: 'Home', href: '/dashboard', icon: Home },
  { title: 'Notifications', href: '/notifications', icon: Bell },
  { title: 'Settings', href: '/settings/profile', icon: Settings },
]

export function MobileNav() {
  const pathname = usePathname()
  const { data: user } = useCurrentUser()
  const { data: tenantData } = useCurrentTenant()

  const isSiteAdmin = user?.profile?.role === 'site_admin'
  const isTenantAdmin = tenantData?.role === 'admin'

  // Add Users tab for admins
  const navItems = [...mainNavItems]
  if (isTenantAdmin || isSiteAdmin) {
    navItems.push({ title: 'Users', href: '/settings/users', icon: Users })
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-card md:hidden">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <item.icon className={cn('h-5 w-5', isActive && 'fill-primary')} />
              <span>{item.title}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
