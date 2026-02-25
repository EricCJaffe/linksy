'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Globe, Calendar, BarChart3, LifeBuoy, ClipboardCheck, Webhook, Mail } from 'lucide-react'

interface DashboardStats {
  pendingTickets: number
  activeHosts: number
  pendingImports: number
  activeWebhooks: number
}

export function DashboardTab() {
  const router = useRouter()

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/admin/dashboard-stats')
      if (!res.ok) throw new Error('Failed to fetch stats')
      return res.json()
    },
  })

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used administrative tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button onClick={() => router.push('/dashboard/providers?action=create')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Provider
            </Button>
            <Button onClick={() => router.push('/dashboard/admin?tab=hosts')}>
              <Globe className="h-4 w-4 mr-2" />
              Manage Hosts
            </Button>
            <Button onClick={() => router.push('/dashboard/admin?tab=events')}>
              <Calendar className="h-4 w-4 mr-2" />
              Manage Events
            </Button>
            <Button variant="outline" onClick={() => router.push('/dashboard/reports')}>
              <BarChart3 className="h-4 w-4 mr-2" />
              View Reports
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Pending Support Tickets"
          value={isLoading ? '—' : (stats?.pendingTickets || 0)}
          icon={LifeBuoy}
          onClick={() => router.push('/dashboard/admin?tab=support-tickets')}
        />
        <StatCard
          title="Active Widget Hosts"
          value={isLoading ? '—' : (stats?.activeHosts || 0)}
          icon={Globe}
          onClick={() => router.push('/dashboard/admin?tab=hosts')}
        />
        <StatCard
          title="Pending Imports"
          value={isLoading ? '—' : (stats?.pendingImports || 0)}
          icon={ClipboardCheck}
          onClick={() => router.push('/dashboard/admin?tab=review-imports')}
        />
        <StatCard
          title="Active Webhooks"
          value={isLoading ? '—' : (stats?.activeWebhooks || 0)}
          icon={Webhook}
          onClick={() => router.push('/dashboard/admin?tab=webhooks')}
        />
      </div>

      {/* Admin Tools Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Administration Tools</CardTitle>
          <CardDescription>Access all platform management features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <AdminToolCard
              icon={LifeBuoy}
              title="Support Tickets"
              description="Manage provider support requests"
              onClick={() => router.push('/dashboard/admin?tab=support-tickets')}
            />
            <AdminToolCard
              icon={Globe}
              title="Widget Hosts"
              description="Configure embeddable widgets"
              onClick={() => router.push('/dashboard/admin?tab=hosts')}
            />
            <AdminToolCard
              icon={Mail}
              title="Email Templates"
              description="Customize system emails"
              onClick={() => router.push('/dashboard/admin?tab=email-templates')}
            />
            <AdminToolCard
              icon={Webhook}
              title="Webhooks"
              description="Manage API integrations"
              onClick={() => router.push('/dashboard/admin?tab=webhooks')}
            />
            <AdminToolCard
              icon={ClipboardCheck}
              title="Review Imports"
              description="Approve pending data imports"
              onClick={() => router.push('/dashboard/admin?tab=review-imports')}
            />
            <AdminToolCard
              icon={Calendar}
              title="Events"
              description="Manage platform events"
              onClick={() => router.push('/dashboard/admin?tab=events')}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

interface StatCardProps {
  title: string
  value: number | string
  icon: React.ComponentType<{ className?: string }>
  onClick: () => void
}

function StatCard({ title, value, icon: Icon, onClick }: StatCardProps) {
  return (
    <Card className="cursor-pointer hover:bg-accent transition-colors" onClick={onClick}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  )
}

interface AdminToolCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  onClick: () => void
}

function AdminToolCard({ icon: Icon, title, description, onClick }: AdminToolCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-start gap-3 p-4 rounded-lg border border-border hover:bg-accent hover:border-accent-foreground/20 transition-colors text-left"
    >
      <div className="p-2 rounded-md bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  )
}
