'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, RefreshCw, Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

export default function MergeContactsPage() {
  const [providerId, setProviderId] = useState('')
  const [loading, setLoading] = useState(false)
  const [duplicates, setDuplicates] = useState<any[]>([])
  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(null)
  const [selectedMerge, setSelectedMerge] = useState<string | null>(null)
  const [merging, setMerging] = useState(false)

  // Fetch providers for the dropdown/search
  const { data: providers } = useQuery({
    queryKey: ['providers-list'],
    queryFn: async () => {
      const res = await fetch('/api/providers?limit=500')
      if (!res.ok) throw new Error('Failed to fetch providers')
      return res.json()
    },
  })

  const findDuplicates = async () => {
    if (!providerId) {
      alert('Please enter a provider ID')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/admin/contacts/duplicates?provider_id=${providerId}`)
      const data = await res.json()
      setDuplicates(data.duplicates || [])

      if (data.duplicates.length === 0) {
        alert('No duplicate contacts found for this provider')
      }
    } catch (error) {
      console.error('Error finding duplicates:', error)
      alert('Failed to find duplicates')
    } finally {
      setLoading(false)
    }
  }

  const handleMerge = async (primaryId: string, mergeId: string) => {
    if (!confirm('Are you sure you want to merge these contacts? This action cannot be undone.')) {
      return
    }

    setMerging(true)
    try {
      const res = await fetch('/api/admin/contacts/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryContactId: primaryId,
          mergeContactId: mergeId,
          providerId,
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
        <h1 className="text-3xl font-bold mb-2">Merge Duplicate Contacts</h1>
        <p className="text-muted-foreground">
          Find and merge duplicate contact records within a provider. Assigned tickets and notes will be transferred to the primary contact.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Find Duplicates</CardTitle>
          <CardDescription>
            Enter a provider ID to search for duplicate contacts (contacts with the same email address).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label htmlFor="providerId">Provider ID</Label>
              <Input
                id="providerId"
                placeholder="Enter provider ID (UUID)"
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tip: Go to a provider detail page and copy the ID from the URL
              </p>
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
              No duplicates found. Enter a provider ID and click "Find Duplicates" to search.
            </p>
          )}

          {duplicates.length > 0 && (
            <div className="text-sm text-muted-foreground">
              Found {duplicates.length} duplicate email{duplicates.length !== 1 ? 's' : ''}
            </div>
          )}
        </CardContent>
      </Card>

      {duplicates.map((group, groupIndex) => (
        <Card key={groupIndex}>
          <CardHeader>
            <CardTitle className="text-lg">Duplicate Email: {group.email}</CardTitle>
            <CardDescription>
              {group.contacts.length} contacts with the same email. Select which one to keep (primary) and which to merge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {group.contacts.map((contact: any) => (
                <div
                  key={contact.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{contact.full_name || 'No name'}</h3>
                        {contact.is_primary_contact && (
                          <Badge variant="default">Primary</Badge>
                        )}
                        {contact.is_default_referral_handler && (
                          <Badge variant="secondary">Default Handler</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Email: {contact.email}</div>
                        <div>Job Title: {contact.job_title || 'N/A'}</div>
                        <div className="text-xs">Created: {new Date(contact.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={selectedPrimary === contact.id ? 'default' : 'outline'}
                        onClick={() => {
                          setSelectedPrimary(contact.id)
                          if (selectedMerge === contact.id) setSelectedMerge(null)
                        }}
                      >
                        {selectedPrimary === contact.id && <CheckCircle2 className="mr-1 h-3 w-3" />}
                        Keep This
                      </Button>
                      <Button
                        size="sm"
                        variant={selectedMerge === contact.id ? 'destructive' : 'outline'}
                        onClick={() => {
                          setSelectedMerge(contact.id)
                          if (selectedPrimary === contact.id) setSelectedPrimary(null)
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
                    This will merge the selected contact into the primary contact and delete the merged one. Tickets and notes will be transferred.
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
