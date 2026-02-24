'use client'

import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Copy, ExternalLink, Zap, Settings } from 'lucide-react'
import Link from 'next/link'
import type { Provider } from '@/lib/types/linksy'

function useHosts() {
  return useQuery<Provider[]>({
    queryKey: ['hosts'],
    queryFn: async () => {
      const res = await fetch('/api/providers?is_host=true')
      if (!res.ok) throw new Error('Failed to fetch hosts')
      const data = await res.json()
      return (data.providers ?? data ?? []).filter((p: Provider) => p.is_host)
    },
  })
}

export default function HostsPage() {
  const { data: hosts, isLoading } = useHosts()

  function copyEmbedUrl(slug: string) {
    const url = `${window.location.origin}/find-help/${slug}`
    navigator.clipboard.writeText(url)
  }

  function copyIframeSnippet(slug: string) {
    const url = `${window.location.origin}/find-help/${slug}`
    const snippet = `<iframe src="${url}" style="width:100%;height:700px;border:0;border-radius:8px;" title="Find Local Resources" allow="geolocation"></iframe>`
    navigator.clipboard.writeText(snippet)
  }

  const activeHosts = (hosts ?? []).filter((h) => h.is_active && h.host_embed_active)
  const inactiveHosts = (hosts ?? []).filter((h) => !h.is_active || !h.host_embed_active)
  const totalSearches = (hosts ?? []).reduce((sum, h) => sum + (h.host_searches_this_month ?? 0), 0)
  const totalTokens = (hosts ?? []).reduce((sum, h) => sum + (h.host_tokens_used_this_month ?? 0), 0)
  const hostsWithBudget = (hosts ?? []).filter((h) => h.host_monthly_token_budget != null)
  const overBudgetCount = (hosts ?? []).filter(
    (h) => h.host_monthly_token_budget != null && h.host_tokens_used_this_month >= h.host_monthly_token_budget
  ).length
  const avgTokensPerSearch = totalSearches > 0 ? Math.round(totalTokens / totalSearches) : 0
  const weightedBudgetUtilization = hostsWithBudget.length
    ? Math.round(
        (hostsWithBudget.reduce(
          (sum, h) =>
            sum +
            Math.min(100, ((h.host_tokens_used_this_month ?? 0) / (h.host_monthly_token_budget || 1)) * 100),
          0
        ) /
          hostsWithBudget.length) *
          10
      ) / 10
    : null

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Widget Hosts</h1>
          <p className="text-sm text-muted-foreground">
            Organizations that embed the Linksy widget on their website
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active Hosts</p>
            <p className="text-2xl font-bold">{activeHosts.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Searches This Month</p>
            <p className="text-2xl font-bold">{totalSearches.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Tokens This Month</p>
            <p className="text-2xl font-bold">{totalTokens.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Tokens / Search</p>
            <p className="text-2xl font-bold">{avgTokensPerSearch.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Budget Health</p>
            <p className="text-2xl font-bold">{overBudgetCount} over</p>
            <p className="text-xs text-muted-foreground mt-1">
              {weightedBudgetUtilization != null
                ? `${weightedBudgetUtilization}% avg utilization`
                : 'No budgets set'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Hosts Table */}
      {isLoading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded bg-muted" />)}
        </div>
      ) : hosts?.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No hosts configured yet. Open a provider's detail page and enable host mode in the Host Settings tab.
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Widget URL</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Searches</TableHead>
                <TableHead className="text-right">Tokens Used</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
                <TableHead className="w-40"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(hosts ?? []).map((host) => {
                const widgetUrl = `/find-help/${host.slug}`
                const overBudget =
                  host.host_monthly_token_budget != null &&
                  host.host_tokens_used_this_month >= host.host_monthly_token_budget
                const utilizationPct = host.host_monthly_token_budget
                  ? Math.round(((host.host_tokens_used_this_month ?? 0) / host.host_monthly_token_budget) * 1000) / 10
                  : null

                return (
                  <TableRow key={host.id} className={!host.is_active || !host.host_embed_active ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/dashboard/providers/${host.id}`}
                        className="hover:underline text-primary"
                      >
                        {host.name}
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      /find-help/{host.slug}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {host.is_active && host.host_embed_active ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">
                            {!host.is_active ? 'Provider Inactive' : 'Embed Disabled'}
                          </Badge>
                        )}
                        {overBudget && (
                          <Badge variant="destructive">Over Budget</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(host.host_searches_this_month ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {(host.host_tokens_used_this_month ?? 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {host.host_monthly_token_budget != null
                        ? host.host_monthly_token_budget.toLocaleString()
                        : '∞'}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {utilizationPct != null ? `${utilizationPct}%` : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/dashboard/admin/hosts/${host.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Host settings">
                            <Settings className="h-3 w-3" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Copy widget URL"
                          onClick={() => copyEmbedUrl(host.slug)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Copy iframe snippet"
                          onClick={() => copyIframeSnippet(host.slug)}
                        >
                          <Zap className="h-3 w-3" />
                        </Button>
                        <a
                          href={widgetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Preview widget">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
