'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmailTemplateEditor } from '@/components/admin/hosts/email-template-editor'
import { CustomFormBuilder } from '@/components/admin/hosts/custom-form-builder'
import type { Provider } from '@/lib/types/linksy'

interface HostSettingsPageProps {
  params: { hostId: string }
}

export default function HostSettingsPage({ params }: HostSettingsPageProps) {
  const router = useRouter()
  const { hostId } = params

  const { data: host, isLoading } = useQuery<Provider>({
    queryKey: ['provider', hostId],
    queryFn: async () => {
      const res = await fetch(`/api/providers/${hostId}`)
      if (!res.ok) throw new Error('Failed to fetch host')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!host) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Host not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{host.name}</h1>
          <p className="text-sm text-muted-foreground">Host Settings & Customization</p>
        </div>
      </div>

      <Tabs defaultValue="email-templates" className="w-full">
        <TabsList>
          <TabsTrigger value="email-templates">Email Templates</TabsTrigger>
          <TabsTrigger value="custom-fields">Custom Form Fields</TabsTrigger>
        </TabsList>

        <TabsContent value="email-templates" className="mt-6">
          <EmailTemplateEditor hostId={hostId} />
        </TabsContent>

        <TabsContent value="custom-fields" className="mt-6">
          <CustomFormBuilder hostId={hostId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
