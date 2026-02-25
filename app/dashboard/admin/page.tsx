'use client'

import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Building2,
  Layers,
  Shield,
  BarChart3,
  LayoutDashboard,
  LifeBuoy,
  AlertTriangle,
  Globe,
  FileText,
  Webhook,
  Mail,
  Merge,
  ClipboardCheck,
  Calendar,
} from 'lucide-react'
import { TenantsTab } from '@/components/admin/console/tenants-tab'
import { ModulesTab } from '@/components/admin/console/modules-tab'
import { SecurityTab } from '@/components/admin/console/security-tab'
import { StatisticsTab } from '@/components/admin/console/statistics-tab'
import { DashboardTab } from '@/components/admin/console/dashboard-tab'
import { SupportTicketsTab } from '@/components/admin/console/support-tickets-tab'
import { CrisisTab } from '@/components/admin/console/crisis-tab'

// Lazy-load tabs that are imported from existing pages
import dynamic from 'next/dynamic'

const HostsTab = dynamic(() => import('@/app/dashboard/admin/hosts/page').then(mod => ({ default: mod.default })), { ssr: false })
const DocsTab = dynamic(() => import('@/app/dashboard/admin/docs/page').then(mod => ({ default: mod.default })), { ssr: false })
const WebhooksTab = dynamic(() => import('@/app/dashboard/admin/webhooks/page').then(mod => ({ default: mod.default })), { ssr: false })
const EmailTemplatesTab = dynamic(() => import('@/app/dashboard/admin/email-templates/page').then(mod => ({ default: mod.default })), { ssr: false })
const MergeProvidersTab = dynamic(() => import('@/app/dashboard/admin/merge-providers/page').then(mod => ({ default: mod.default })), { ssr: false })
const MergeContactsTab = dynamic(() => import('@/app/dashboard/admin/merge-contacts/page').then(mod => ({ default: mod.default })), { ssr: false })
const ReviewImportsTab = dynamic(() => import('@/app/dashboard/admin/review-imports/page').then(mod => ({ default: mod.default })), { ssr: false })
const EventsTab = dynamic(() => import('@/app/dashboard/admin/events/page').then(mod => ({ default: mod.default })), { ssr: false })

export default function AdminConsolePage() {
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get('tab') || 'dashboard'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Console</h1>
        <p className="text-muted-foreground">
          Centralized administration and platform management
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            <span>Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="tenants" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>Tenants</span>
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span>Modules</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span>Statistics</span>
          </TabsTrigger>
          <TabsTrigger value="support-tickets" className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4" />
            <span>Support Tickets</span>
          </TabsTrigger>
          <TabsTrigger value="crisis" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Crisis Detection</span>
          </TabsTrigger>
          <TabsTrigger value="hosts" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span>Widget Hosts</span>
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Docs Manager</span>
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            <span>Webhooks</span>
          </TabsTrigger>
          <TabsTrigger value="email-templates" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            <span>Email Templates</span>
          </TabsTrigger>
          <TabsTrigger value="merge-providers" className="flex items-center gap-2">
            <Merge className="h-4 w-4" />
            <span>Merge Providers</span>
          </TabsTrigger>
          <TabsTrigger value="merge-contacts" className="flex items-center gap-2">
            <Merge className="h-4 w-4" />
            <span>Merge Contacts</span>
          </TabsTrigger>
          <TabsTrigger value="review-imports" className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4" />
            <span>Review Imports</span>
          </TabsTrigger>
          <TabsTrigger value="events" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Events</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          <DashboardTab />
        </TabsContent>

        <TabsContent value="tenants" className="space-y-6">
          <TenantsTab />
        </TabsContent>

        <TabsContent value="modules" className="space-y-6">
          <ModulesTab />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecurityTab />
        </TabsContent>

        <TabsContent value="statistics" className="space-y-6">
          <StatisticsTab />
        </TabsContent>

        <TabsContent value="support-tickets" className="space-y-6">
          <SupportTicketsTab />
        </TabsContent>

        <TabsContent value="crisis" className="space-y-6">
          <CrisisTab />
        </TabsContent>

        <TabsContent value="hosts" className="space-y-6">
          <HostsTab />
        </TabsContent>

        <TabsContent value="docs" className="space-y-6">
          <DocsTab />
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          <WebhooksTab />
        </TabsContent>

        <TabsContent value="email-templates" className="space-y-6">
          <EmailTemplatesTab />
        </TabsContent>

        <TabsContent value="merge-providers" className="space-y-6">
          <MergeProvidersTab />
        </TabsContent>

        <TabsContent value="merge-contacts" className="space-y-6">
          <MergeContactsTab />
        </TabsContent>

        <TabsContent value="review-imports" className="space-y-6">
          <ReviewImportsTab />
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <EventsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
