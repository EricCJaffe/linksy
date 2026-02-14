'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, Palette, Users } from 'lucide-react'
import { CompanyTab } from '@/components/company/console/company-tab'
import { BrandingTab } from '@/components/company/console/branding-tab'
import { UsersTab } from '@/components/company/console/users-tab'

export default function CompanyAdminPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Company Admin</h1>
        <p className="text-muted-foreground">
          Manage your organization settings, branding, and team
        </p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[450px]">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">Company</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Users</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="space-y-6">
          <CompanyTab />
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <BrandingTab />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UsersTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
