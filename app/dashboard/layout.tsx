'use client'

import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { DashboardLoading } from '@/components/layout/dashboard-loading'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useCurrentTenant } from '@/lib/hooks/useCurrentTenant'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: user, isLoading: isUserLoading, error: userError } = useCurrentUser()
  const { data: tenantData, isLoading: isTenantLoading, error: tenantError } = useCurrentTenant()

  // Show error state if hooks failed
  if (userError || tenantError) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 max-w-md p-6">
          <h2 className="text-xl font-semibold text-destructive">Error Loading Dashboard</h2>
          <p className="text-sm text-muted-foreground text-center">
            {userError ? `User Error: ${userError.message}` : `Tenant Error: ${tenantError?.message}`}
          </p>
          <p className="text-xs text-muted-foreground text-center">
            Check the browser console for more details. Make sure Supabase is configured correctly.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Reload Page
          </button>
        </div>
      </div>
    )
  }

  // Show loading state while fetching user and tenant data
  if (isUserLoading || isTenantLoading) {
    return <DashboardLoading />
  }

  // If no user, the middleware should redirect to login
  if (!user) {
    return <DashboardLoading />
  }

  return (
    <ErrorBoundary componentName="DashboardLayout" showReloadButton>
      <div className="flex h-screen">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <MobileNav />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 pb-20 md:pb-6">
            <ErrorBoundary componentName="DashboardContent">
              {children}
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  )
}
