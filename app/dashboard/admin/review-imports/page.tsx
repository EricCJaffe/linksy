'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, RefreshCw, Clock, AlertCircle, CheckSquare } from 'lucide-react'

interface PendingProvider {
  id: string
  name: string
  email: string | null
  phone: string | null
  sector: string
  import_source: string | null
  imported_at: string | null
  created_at: string
}

const LIMIT = 50

export default function ReviewImportsPage() {
  const router = useRouter()
  const [providers, setProviders] = useState<PendingProvider[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState(false)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)

  const fetchPendingProviders = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/providers/review-imports?limit=${LIMIT}&offset=${offset}`)
      if (res.ok) {
        const data = await res.json()
        setProviders(data.providers || [])
        setTotal(data.pagination.total)
      }
    } catch (error) {
      console.error('Error fetching pending providers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingProviders()
  }, [offset])

  const handleReview = async (action: 'approve' | 'reject') => {
    if (selectedIds.size === 0) {
      alert('Please select at least one provider')
      return
    }

    const actionLabel = action === 'approve' ? 'approve' : 'reject'
    if (!confirm(`Are you sure you want to ${actionLabel} ${selectedIds.size} provider${selectedIds.size !== 1 ? 's' : ''}?`)) {
      return
    }

    setProcessing(true)
    try {
      const res = await fetch('/api/admin/providers/review-imports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_ids: Array.from(selectedIds),
          action,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to review providers')
      }

      const data = await res.json()
      alert(data.message)
      setSelectedIds(new Set())
      await fetchPendingProviders()
    } catch (error: any) {
      console.error('Error reviewing providers:', error)
      alert(error.message || 'Failed to review providers')
    } finally {
      setProcessing(false)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === providers.length && providers.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(providers.map(p => p.id)))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const allSelected = providers.length > 0 && selectedIds.size === providers.length
  const someSelected = selectedIds.size > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Review Imported Providers</h1>
        <p className="text-muted-foreground">
          Review and approve providers pending activation
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Pending Approval
                {total > 0 && (
                  <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                    {total}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Imported providers awaiting review
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPendingProviders}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {someSelected && (
            <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2 mb-4">
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <div className="ml-auto flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleReview('approve')}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReview('reject')}
                  disabled={processing}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                  disabled={processing}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {loading && providers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
              Loading pending providers...
            </div>
          ) : providers.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No providers pending approval. All imports have been reviewed!
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Provider Name</TableHead>
                    <TableHead>Sector</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Import Source</TableHead>
                    <TableHead>Imported</TableHead>
                    <TableHead className="w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providers.map((provider) => (
                    <TableRow key={provider.id} className={selectedIds.has(provider.id) ? 'bg-muted/50' : ''}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedIds.has(provider.id)}
                          onCheckedChange={() => toggleSelect(provider.id)}
                          aria-label={`Select ${provider.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{provider.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{provider.sector}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {provider.email || provider.phone || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {provider.import_source || 'unknown'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {provider.imported_at
                          ? new Date(provider.imported_at).toLocaleDateString()
                          : new Date(provider.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedIds(new Set([provider.id]))
                              handleReview('approve')
                            }}
                            disabled={processing}
                            className="text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedIds(new Set([provider.id]))
                              handleReview('reject')
                            }}
                            disabled={processing}
                            className="text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {total > LIMIT && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1} - {Math.min(offset + LIMIT, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                  disabled={offset === 0}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setOffset(offset + LIMIT)}
                  disabled={offset + LIMIT >= total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
