'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, User, Settings } from 'lucide-react'
import { useCurrentUser, useSignOut } from '@/lib/hooks/useCurrentUser'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { SearchBar } from '@/components/shared/search-bar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function Header() {
  const router = useRouter()
  const { data: user } = useCurrentUser()
  const { mutate: signOut, isPending: isSigningOut } = useSignOut()

  const handleSignOut = () => {
    signOut(undefined, {
      onSuccess: () => {
        router.push('/login')
      },
    })
  }

  const initials = user?.profile?.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase() || user?.email?.[0].toUpperCase() || '?'

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b bg-card px-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="text-xl font-bold">
          {process.env.NEXT_PUBLIC_APP_NAME || 'SaaS App'}
        </Link>
      </div>

      <div className="hidden flex-1 md:block md:max-w-md">
        <SearchBar placeholder="Search..." />
      </div>

      <div className="flex items-center gap-4">
        <NotificationBell />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar>
                <AvatarImage
                  src={user?.profile?.avatar_url || undefined}
                  alt={user?.profile?.full_name || 'User'}
                />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {user?.profile?.full_name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/profile" className="cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/profile" className="cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isSigningOut ? 'Signing out...' : 'Sign out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
