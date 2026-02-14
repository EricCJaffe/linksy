'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Layers, Shield, BarChart3, Users, Activity, Lock, Database } from 'lucide-react'
import { TenantsTab } from '@/components/admin/console/tenants-tab'
import { ModulesTab } from '@/components/admin/console/modules-tab'
import { SecurityTab } from '@/components/admin/console/security-tab'
import { StatisticsTab } from '@/components/admin/console/statistics-tab'

export default function AdminConsolePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Console</h1>
        <p className="text-muted-foreground">
          Centralized administration and platform management
        </p>
      </div>

      <Tabs defaultValue="tenants" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="tenants" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Tenants</span>
          </TabsTrigger>
          <TabsTrigger value="modules" className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Modules</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
          <TabsTrigger value="statistics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Statistics</span>
          </TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  )
}
