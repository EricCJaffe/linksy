'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, RefreshCw, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function MergeProvidersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [duplicates, setDuplicates] = useState<any[]>([])
  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(null)
  const [selectedMerge, setSelectedMerge] = useState<string | null>(null)
  const [merging, setMerging] = useState(false)
  const [threshold, setThreshold] = useState(0.7)

  const findDuplicates = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/providers/duplicates?threshold=${threshold}&limit=100`)
      const data = await res.json()
      setDuplicates(data.duplicates || [])
    } catch (error) {
      console.error('Error finding duplicates:', error)
      alert('Failed to find duplicates')
    } finally {
      setLoading(false)
    }
  }

  const handleMerge = async (primaryId: string, mergeId: string) => {
    if (!confirm('Are you sure you want to merge these providers? This action cannot be undone.')) {
      return
    }

    setMerging(true)
    try {
      const res = await fetch('/api/admin/providers/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryProviderId: primaryId,
          mergeProviderId: mergeId,
          fieldChoices: {}, // For now, keep all primary fields
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Merge failed')
      }

      const data = await res.json()
      alert(data.message)

      // Refresh the duplicates list
      await findDuplicates()
      setSelectedPrimary(null)
      setSelectedMerge(null)
    } catch (error: any) {
      console.error('Merge error:', error)
      alert(`Failed to merge: ${error.message}`)
    } finally {
      setMerging(false)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Merge Duplicate Providers</h1>
        <p className="text-muted-foreground">
          Find and merge duplicate provider records. All associated data (locations, contacts, notes, tickets) will be transferred to the primary provider.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Find Duplicates</CardTitle>
          <CardDescription>
            Search for providers with similar names. Adjust the threshold to be more or less strict (0.0 = very different, 1.0 = exact match).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="threshold">Similarity Threshold</Label>
              <Input
                id="threshold"
                type="number"
                min="0"
                max="1"
                step="0.1"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
              />
            </div>
            <Button onClick={findDuplicates} disabled={loading}>
              {loading ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Find Duplicates
                </>
              )}
            </Button>
          </div>

          {duplicates.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">
              No duplicates found. Click "Find Duplicates" to search.
            </p>
          )}

          {duplicates.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Found {duplicates.length} potential duplicate group{duplicates.length !== 1 ? 's' : ''}
            </div>
          )}
        </CardContent>
      </Card>

      {duplicates.map((group, groupIndex) => (
        <Card key={groupIndex}>
          <CardHeader>
            <CardTitle className="text-lg">Duplicate Group {groupIndex + 1}</CardTitle>
            <CardDescription>
              {group.providers.length} providers with similar names. Select which one to keep (primary) and which to merge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {group.providers.map((provider: any) => (
                <div
                  key={provider.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{provider.name}</h3>
                        {!provider.is_active && (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Email: {provider.email || 'N/A'}</div>
                        <div>Phone: {provider.phone || 'N/A'}</div>
                        <div>Website: {provider.website || 'N/A'}</div>
                        <div>Sector: {provider.sector}</div>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground mt-2">
                        <span>{provider.counts.locations} locations</span>
                        <span>{provider.counts.contacts} contacts</span>
                        <span>{provider.counts.notes} notes</span>
                        <span>{provider.counts.tickets} tickets</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={selectedPrimary === provider.id ? 'default' : 'outline'}
                        onClick={() => {
                          setSelectedPrimary(provider.id)
                          if (selectedMerge === provider.id) setSelectedMerge(null)
                        }}
                      >
                        {selectedPrimary === provider.id && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        Keep This
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedMerge === provider.id ? 'destructive' : 'outline'}
                        onClick={() => {
                          setSelectedMerge(provider.id)
                          if (selectedPrimary === provider.id) setSelectedPrimary(null)
                        }}
                      >
                        Merge This
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              {selectedPrimary && selectedMerge && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-medium">Ready to merge</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    This will merge the selected provider into the primary provider and delete the merged one. All data will be transferred.
                  </p>
                  <Button
                    onClick={() => handleMerge(selectedPrimary, selectedMerge)}
                    disabled={merging}
                  >
                    {merging ? 'Merging...' : 'Confirm Merge'}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
