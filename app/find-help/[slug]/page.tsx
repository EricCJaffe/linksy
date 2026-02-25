import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { FindHelpWidget } from '@/components/widget/find-help-widget'
import type { HostWidgetConfig } from '@/lib/types/linksy'

interface PageProps {
  params: { slug: string }
}

// Force dynamic rendering for host-specific widget pages
export const dynamic = 'force-dynamic'
export const dynamicParams = true

/**
 * /find-help/[slug]
 *
 * Host-specific widget page. The slug resolves to a provider marked as a host.
 * No API key needed — the slug IS the credential.
 * All search sessions are tagged with the host provider's ID for analytics.
 *
 * Domain enforcement: if host_allowed_domains is set, the Referer header must
 * match one of the listed domains. Direct navigation (no Referer) is always allowed
 * so admins and developers can preview the widget.
 */
export default async function HostWidgetPage({ params }: PageProps) {
  const { slug } = params
  const supabase = await createServiceClient()

  const { data, error } = await supabase.rpc('linksy_resolve_host', { p_slug: slug })

  if (error || !data || data.length === 0) {
    notFound()
  }

  const host = data[0]

  // Domain allowlist enforcement
  const allowedDomains = host.allowed_domains as string[] | null
  if (allowedDomains && allowedDomains.length > 0) {
    const headersList = await headers()
    const referer = headersList.get('referer') || ''
    if (referer) {
      try {
        const refererHostname = new URL(referer).hostname
        const isAllowed = allowedDomains.some(
          (d) => refererHostname === d || refererHostname.endsWith('.' + d)
        )
        if (!isAllowed) {
          return (
            <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
              <div className="max-w-sm text-center">
                <p className="text-lg font-semibold text-muted-foreground">
                  This widget is not authorized for this domain.
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Contact the host organization if you believe this is an error.
                </p>
              </div>
            </div>
          )
        }
      } catch {
        // Unparseable Referer — allow through
      }
    }
  }

  if (host.over_budget) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/40 p-6">
        <div className="max-w-sm text-center">
          <p className="text-lg font-semibold text-muted-foreground">
            This search widget is temporarily unavailable.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Please contact the organization for assistance.
          </p>
        </div>
      </div>
    )
  }

  const widgetConfig: HostWidgetConfig = host.widget_config ?? {}

  return (
    <FindHelpWidget
      hostProviderId={host.provider_id}
      hostProviderName={host.provider_name}
      widgetConfig={widgetConfig}
    />
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = params
  const supabase = await createServiceClient()
  const { data } = await supabase.rpc('linksy_resolve_host', { p_slug: slug })

  const name = data?.[0]?.provider_name ?? 'Community Resource Finder'
  return {
    title: `${name} — Find Local Resources`,
    description: `Search for community services and resources near you.`,
  }
}
