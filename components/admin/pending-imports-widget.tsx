'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ClipboardCheck, RefreshCw, AlertCircle } from 'lucide-react'

interface PendingImportsStats {
  total: number
}

export function PendingImportsWidget() {
  const router = useRouter()
  const [stats, setStats] = useState<PendingImportsStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/providers/review-imports?limit=1')
      if (res.ok) {
        const data = await res.json()
        setStats({ total: data.pagination.total })
      }
    } catch (error) {
      console.error('Error fetching pending imports:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    // Refresh every 5 minutes
    const interval = setInterval(fetchStats, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Pending Imports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  const hasPendingImports = stats && stats.total > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Pending Imports
              {hasPendingImports && (
                <Badge variant="outline" className="ml-2 bg-amber-50 text-amber-800 border-amber-200">
                  {stats.total}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Imported providers awaiting review
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={fetchStats}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasPendingImports ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No pending imports. All providers have been reviewed!
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="text-center py-6">
              <div className="text-4xl font-bold text-amber-600">{stats.total}</div>
              <p className="text-sm text-muted-foreground mt-1">
                provider{stats.total !== 1 ? 's' : ''} awaiting approval
              </p>
            </div>

            <Button
              className="w-full"
              onClick={() => router.push('/dashboard/admin/review-imports')}
            >
              Review Imports
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
