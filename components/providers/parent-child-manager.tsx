'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useProviderHierarchy, useProviderChildren, useSetParentProvider } from '@/lib/hooks/useProviderHierarchy'
import { useQueryClient } from '@tanstack/react-query'
import { Building2, Link2, Unlink, Users, AlertCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import type { Provider } from '@/lib/types/linksy'

interface ParentChildManagerProps {
  providerId: string
  isSiteAdmin: boolean
}

export function ParentChildManager({ providerId, isSiteAdmin }: ParentChildManagerProps) {
  const { data: hierarchy, isLoading } = useProviderHierarchy(providerId)
  const { data: childrenData } = useProviderChildren(providerId)
  const setParent = useSetParentProvider()
  const queryClient = useQueryClient()

  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [isUnlinkDialogOpen, setIsUnlinkDialogOpen] = useState(false)
  const [parentProviderSearch, setParentProviderSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Provider[]>([])
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const provider = hierarchy?.provider
  const parent = hierarchy?.parent
  const children = childrenData?.children || []

  const handleSearchParent = async () => {
    if (!parentProviderSearch.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(`/api/providers?q=${encodeURIComponent(parentProviderSearch)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        // Filter out the current provider and any providers that are already children
        const filtered = (data.providers || []).filter(
          (p: Provider) => p.id !== providerId && !p.parent_provider_id
        )
        setSearchResults(filtered)
      }
    } catch (error) {
      console.error('Failed to search providers:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const handleLinkToParent = async () => {
    if (!selectedParentId) return

    try {
      await setParent.mutateAsync({
        providerId,
        parentProviderId: selectedParentId,
      })

      setIsLinkDialogOpen(false)
      setParentProviderSearch('')
      setSearchResults([])
      setSelectedParentId(null)

      // Refresh provider detail
      queryClient.invalidateQueries({ queryKey: ['provider-detail', providerId] })
    } catch (error) {
      console.error('Failed to link to parent:', error)
    }
  }

  const handleUnlink = async () => {
    try {
      await setParent.mutateAsync({
        providerId,
        parentProviderId: null,
      })

      setIsUnlinkDialogOpen(false)

      // Refresh provider detail
      queryClient.invalidateQueries({ queryKey: ['provider-detail', providerId] })
    } catch (error) {
      console.error('Failed to unlink from parent:', error)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Structure
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organization Structure
          </CardTitle>
          <CardDescription>
            Manage parent/child relationships for multi-location organizations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Parent Organization */}
          {parent ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Parent Organization</Label>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Link
                      href={`/dashboard/providers/${parent.id}`}
                      className="font-medium hover:underline flex items-center gap-1"
                    >
                      {parent.name}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                    <p className="text-xs text-muted-foreground capitalize">{parent.sector}</p>
                  </div>
                </div>
                {isSiteAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsUnlinkDialogOpen(true)}
                    disabled={setParent.isPending}
                  >
                    <Unlink className="h-4 w-4 mr-2" />
                    Unlink
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                This location is managed as part of the parent organization.
                {isSiteAdmin && ' Admins of the parent can access and manage this location.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Parent Organization</Label>
              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                <p className="text-sm text-muted-foreground">
                  {children.length > 0
                    ? 'This is a parent organization'
                    : 'Not linked to a parent organization'}
                </p>
                {isSiteAdmin && children.length === 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsLinkDialogOpen(true)}
                    disabled={setParent.isPending}
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Link to Parent
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Child Locations */}
          {children.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Child Locations ({children.length})
              </Label>
              <div className="space-y-2">
                {children.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Link
                          href={`/dashboard/providers/${child.id}`}
                          className="font-medium hover:underline flex items-center gap-1"
                        >
                          {child.name}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            variant={child.is_active ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {child.provider_status}
                          </Badge>
                          {child.location_count !== undefined && (
                            <span className="text-xs text-muted-foreground">
                              {child.location_count} {child.location_count === 1 ? 'location' : 'locations'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Admins of this parent organization can access and manage all child locations.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {!isSiteAdmin && !parent && children.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Only site administrators can manage organization structure.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Link to Parent Dialog */}
      <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link to Parent Organization</DialogTitle>
            <DialogDescription>
              Search for a parent organization to link this location to. Only top-level
              organizations can be selected as parents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Organization</Label>
              <div className="flex gap-2">
                <Input
                  id="search"
                  placeholder="Search by name..."
                  value={parentProviderSearch}
                  onChange={(e) => setParentProviderSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchParent()
                    }
                  }}
                />
                <Button onClick={handleSearchParent} disabled={isSearching}>
                  Search
                </Button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedParentId === result.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedParentId(result.id)}
                  >
                    <div className="font-medium">{result.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {result.sector}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {searchResults.length === 0 && parentProviderSearch && !isSearching && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No organizations found. Try a different search term.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleLinkToParent}
              disabled={!selectedParentId || setParent.isPending}
            >
              {setParent.isPending ? 'Linking...' : 'Link to Parent'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink Confirmation Dialog */}
      <Dialog open={isUnlinkDialogOpen} onOpenChange={setIsUnlinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink from Parent Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to unlink this location from{' '}
              <strong>{parent?.name}</strong>? This location will become a standalone
              organization.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUnlinkDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnlink}
              disabled={setParent.isPending}
            >
              {setParent.isPending ? 'Unlinking...' : 'Unlink'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
