'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Building2, Activity, TrendingUp, Database, Zap, MapPin, FileText, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'

function GeocodingCard() {
  const [stats, setStats] = useState<{ total: number; geocoded: number; ungeocoded: number } | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<{ processed: number; succeeded: number; failed: number } | null>(null)

  useEffect(() => {
    fetch('/api/admin/geocode')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
  }, [result])

  const runGeocoding = async () => {
    setIsRunning(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/geocode', { method: 'POST' })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ processed: 0, succeeded: 0, failed: 0 })
    } finally {
      setIsRunning(false)
    }
  }

  const pct = stats && stats.total > 0
    ? Math.round((stats.geocoded / stats.total) * 100)
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Geocoding
        </CardTitle>
        <CardDescription>
          Geocode provider addresses to enable proximity search and map display
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Geocoded locations</span>
              <span className="font-medium">{stats.geocoded} / {stats.total}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.ungeocoded} location{stats.ungeocoded !== 1 ? 's' : ''} pending geocoding
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading geocoding stats…</p>
        )}

        {result && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            Run complete — processed: {result.processed}, succeeded: {result.succeeded}, failed: {result.failed}
          </div>
        )}

        <Button
          onClick={runGeocoding}
          disabled={isRunning || stats?.ungeocoded === 0}
          size="sm"
        >
          {isRunning ? 'Geocoding…' : 'Run Batch Geocoding'}
        </Button>
      </CardContent>
    </Card>
  )
}

export function StatisticsTab() {
  return (
    <>
      <div>
        <h2 className="text-2xl font-bold">Platform Statistics</h2>
        <p className="text-sm text-muted-foreground">
          Overview of platform usage and performance metrics
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Tenants
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Active organizations
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Across all tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Sessions
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Currently online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              API Requests
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Usage Trends</CardTitle>
          <CardDescription>
            Platform activity over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed">
            <div className="flex flex-col items-center gap-2 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">Analytics Dashboard</p>
              <p className="text-sm text-muted-foreground">
                Usage trends and charts will be displayed here
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Growth Metrics */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tenant Growth</CardTitle>
            <CardDescription>
              New organizations over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
              <div className="flex flex-col items-center gap-2 text-center">
                <Building2 className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Tenant growth chart
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User Growth</CardTitle>
            <CardDescription>
              New user registrations over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-[200px] items-center justify-center rounded-lg border border-dashed">
              <div className="flex flex-col items-center gap-2 text-center">
                <Users className="h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  User growth chart
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Storage & Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Usage</CardTitle>
          <CardDescription>
            Storage and system resources
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Database Size</span>
            </div>
            <span className="text-sm font-medium">-- MB</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">File Storage</span>
            </div>
            <span className="text-sm font-medium">-- GB</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">API Rate Limit</span>
            </div>
            <span className="text-sm font-medium">-- / hour</span>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance tools */}
      <div className="grid gap-4 md:grid-cols-2">
        <GeocodingCard />
        <ContextCardsCard />
      </div>
    </>
  )
}

function ContextCardsCard() {
  const [stats, setStats] = useState<{ total: number; generated: number; missing: number } | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<{ updated: number; total: number } | null>(null)

  useEffect(() => {
    fetch('/api/admin/linksy/context-cards')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
  }, [result])

  const runGeneration = async (force = false) => {
    setIsRunning(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/linksy/context-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ updated: 0, total: 0 })
    } finally {
      setIsRunning(false)
    }
  }

  const pct = stats && stats.total > 0
    ? Math.round((stats.generated / stats.total) * 100)
    : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          LLM Context Cards
        </CardTitle>
        <CardDescription>
          Pre-generated provider summaries used for AI-powered search responses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cards generated</span>
              <span className="font-medium">{stats.generated} / {stats.total}</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.missing} provider{stats.missing !== 1 ? 's' : ''} missing context cards
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Loading stats…</p>
        )}

        {result && (
          <div className="rounded-md bg-muted px-3 py-2 text-sm">
            Done — generated {result.updated} of {result.total} context cards
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => runGeneration(false)}
            disabled={isRunning || stats?.missing === 0}
            size="sm"
          >
            {isRunning ? 'Generating…' : 'Generate Missing'}
          </Button>
          <Button
            onClick={() => runGeneration(true)}
            disabled={isRunning}
            size="sm"
            variant="outline"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Regenerate All
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
