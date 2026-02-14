'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Home,
  Search,
  FileQuestion,
  ArrowLeft,
  LayoutDashboard,
  Settings,
  Users,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const POPULAR_PAGES = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'View your dashboard',
  },
  {
    name: 'Activity Feed',
    href: '/activity',
    icon: Activity,
    description: 'See recent activities',
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: Users,
    description: 'Manage team members',
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'Configure your account',
  },
]

export default function NotFound() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Navigate to search page or global search
      router.push(`/dashboard?search=${encodeURIComponent(searchQuery)}`)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Main Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <FileQuestion className="h-8 w-8 text-muted-foreground" />
            </div>
            <CardTitle className="text-3xl">Page not found</CardTitle>
            <p className="text-muted-foreground">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search Bar */}
            <form onSubmit={handleSearch} className="space-y-2">
              <label htmlFor="search" className="text-sm font-medium">
                Search for what you need
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="search"
                    type="text"
                    placeholder="Search pages, users, files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button type="submit">Search</Button>
              </div>
            </form>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go back
              </Button>
              <Button asChild variant="default">
                <Link href="/">
                  <Home className="mr-2 h-4 w-4" />
                  Go home
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Popular Pages */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Popular pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {POPULAR_PAGES.map((page) => {
                const Icon = page.icon
                return (
                  <Link
                    key={page.href}
                    href={page.href}
                    className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{page.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {page.description}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Help Text */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Need help?{' '}
            <a
              href="mailto:support@example.com"
              className="text-primary hover:underline"
            >
              Contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
