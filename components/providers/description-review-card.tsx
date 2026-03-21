'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCw, Calendar, Send } from 'lucide-react'
import type { DescriptionReview } from '@/lib/types/linksy'

interface DescriptionReviewCardProps {
  providerId: string
  nextReviewAt: string | null
  lastReviewAt: string | null
  isSiteAdmin: boolean
}

export function DescriptionReviewCard({
  providerId,
  nextReviewAt,
  lastReviewAt,
  isSiteAdmin,
}: DescriptionReviewCardProps) {
  const [reviews, setReviews] = useState<DescriptionReview[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [overrideDate, setOverrideDate] = useState(nextReviewAt ? nextReviewAt.split('T')[0] : '')
  const [isSaving, setIsSaving] = useState(false)
  const [isTriggering, setIsTriggering] = useState(false)

  const fetchReviews = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/admin/description-review?provider_id=${providerId}`)
      if (res.ok) {
        const data = await res.json()
        setReviews(data)
      }
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false)
    }
  }, [providerId])

  useEffect(() => {
    if (isSiteAdmin) {
      fetchReviews()
    }
  }, [isSiteAdmin, fetchReviews])

  const handleOverrideDate = async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/description-review', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: providerId,
          next_review_at: overrideDate ? new Date(overrideDate).toISOString() : null,
        }),
      })
      if (res.ok) {
        fetchReviews()
      }
    } catch {
      // Silently fail
    } finally {
      setIsSaving(false)
    }
  }

  const handleTriggerReview = async () => {
    setIsTriggering(true)
    try {
      const res = await fetch('/api/admin/description-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider_ids: [providerId] }),
      })
      if (res.ok) {
        fetchReviews()
      }
    } catch {
      // Silently fail
    } finally {
      setIsTriggering(false)
    }
  }

  if (!isSiteAdmin) return null

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    accepted_current: 'bg-green-100 text-green-800',
    accepted_ai: 'bg-blue-100 text-blue-800',
    edited: 'bg-purple-100 text-purple-800',
    expired: 'bg-gray-100 text-gray-800',
    error: 'bg-red-100 text-red-800',
  }

  const statusLabels: Record<string, string> = {
    pending: 'Pending',
    accepted_current: 'No Changes',
    accepted_ai: 'AI Accepted',
    edited: 'Manually Edited',
    expired: 'Expired',
    error: 'Error',
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Description Auto-Review
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleTriggerReview}
            disabled={isTriggering}
          >
            <Send className="h-3 w-3 mr-1" />
            {isTriggering ? 'Sending...' : 'Trigger Review Now'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Schedule info */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Last Review: </span>
            <span>{lastReviewAt ? new Date(lastReviewAt).toLocaleDateString() : 'Never'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Next Review: </span>
            <span>
              {nextReviewAt
                ? new Date(nextReviewAt).toLocaleDateString()
                : 'Default schedule (quarterly)'}
            </span>
          </div>
        </div>

        {/* Override date */}
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Label className="text-sm">Override Next Review Date</Label>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={overrideDate}
                onChange={(e) => setOverrideDate(e.target.value)}
                className="max-w-xs"
              />
            </div>
          </div>
          <Button size="sm" onClick={handleOverrideDate} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          {overrideDate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setOverrideDate('')
                handleOverrideDate()
              }}
              disabled={isSaving}
            >
              Reset to Default
            </Button>
          )}
        </div>

        {/* Review history */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading review history...</p>
        ) : reviews.length > 0 ? (
          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">Review History</Label>
            <div className="space-y-2">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="flex items-center justify-between rounded-md border p-2 text-sm"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusColors[review.status] || ''}>
                      {statusLabels[review.status] || review.status}
                    </Badge>
                    <span className="text-muted-foreground">
                      {new Date(review.triggered_at).toLocaleDateString()}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      via {review.triggered_by}
                    </span>
                  </div>
                  {review.responded_at && (
                    <span className="text-xs text-muted-foreground">
                      Responded: {new Date(review.responded_at).toLocaleDateString()}
                    </span>
                  )}
                  {review.error_message && (
                    <span className="text-xs text-red-500">{review.error_message}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No description reviews yet. Use &quot;Trigger Review Now&quot; to start a review cycle.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
