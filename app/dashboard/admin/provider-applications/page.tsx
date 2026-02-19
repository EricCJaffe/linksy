'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertCircle,
  ClipboardList,
  CheckCircle,
  XCircle,
  MapPin,
  Mail,
  Phone,
  Globe,
  Clock,
} from 'lucide-react'
import {
  useProviderApplications,
  useReviewApplication,
} from '@/lib/hooks/useProviderApplications'
import type { ApplicationStatus, ProviderApplication } from '@/lib/types/linksy'

const sectorLabels: Record<string, string> = {
  nonprofit: 'Nonprofit',
  faith_based: 'Faith Based',
  government: 'Government',
  business: 'Business',
}

export default function ProviderApplicationsPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | 'all'>('pending')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectNotes, setRejectNotes] = useState('')

  const { data, isLoading, error } = useProviderApplications(statusFilter)
  const { data: pendingData } = useProviderApplications('pending')
  const { data: approvedData } = useProviderApplications('approved')
  const { data: rejectedData } = useProviderApplications('rejected')
  const reviewMutation = useReviewApplication()

  const counts = {
    pending: pendingData?.pagination.total ?? 0,
    approved: approvedData?.pagination.total ?? 0,
    rejected: rejectedData?.pagination.total ?? 0,
    all: (pendingData?.pagination.total ?? 0) +
         (approvedData?.pagination.total ?? 0) +
         (rejectedData?.pagination.total ?? 0),
  }

  const handleApprove = async (id: string) => {
    const result = await reviewMutation.mutateAsync({ id, action: 'approve' })
    if (result.providerId) {
      router.push(`/dashboard/providers/${result.providerId}`)
    }
  }

  const handleRejectStart = (id: string) => {
    setRejectingId(id)
    setRejectNotes('')
  }

  const handleRejectConfirm = async () => {
    if (!rejectingId) return
    await reviewMutation.mutateAsync({
      id: rejectingId,
      action: 'reject',
      notes: rejectNotes || undefined,
    })
    setRejectingId(null)
    setRejectNotes('')
  }

  const handleRejectCancel = () => {
    setRejectingId(null)
    setRejectNotes('')
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Provider Applications</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load applications. Please try again.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardList className="h-8 w-8" />
          Provider Applications
        </h1>
        <p className="text-muted-foreground mt-1">
          Review and approve provider listing requests
        </p>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 border-b pb-0">
        {([
          { key: 'pending' as const, label: 'Pending', badgeClass: 'bg-yellow-100 text-yellow-800' },
          { key: 'approved' as const, label: 'Approved', badgeClass: 'bg-green-100 text-green-800' },
          { key: 'rejected' as const, label: 'Rejected', badgeClass: 'bg-red-100 text-red-800' },
          { key: 'all' as const, label: 'All', badgeClass: 'bg-muted text-muted-foreground' },
        ]).map(({ key, label, badgeClass }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors relative ${
              statusFilter === key
                ? 'text-primary border-b-2 border-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {label}
            {counts[key] > 0 && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badgeClass}`}>
                {counts[key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Applications list */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : !data || data.applications.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No {statusFilter === 'all' ? '' : statusFilter} applications found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.applications.map((app) => (
            <ApplicationCard
              key={app.id}
              application={app}
              isReviewing={reviewMutation.isPending}
              isRejecting={rejectingId === app.id}
              rejectNotes={rejectNotes}
              onRejectNotesChange={setRejectNotes}
              onApprove={() => handleApprove(app.id)}
              onRejectStart={() => handleRejectStart(app.id)}
              onRejectConfirm={handleRejectConfirm}
              onRejectCancel={handleRejectCancel}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ApplicationCard({
  application,
  isReviewing,
  isRejecting,
  rejectNotes,
  onRejectNotesChange,
  onApprove,
  onRejectStart,
  onRejectConfirm,
  onRejectCancel,
}: {
  application: ProviderApplication
  isReviewing: boolean
  isRejecting: boolean
  rejectNotes: string
  onRejectNotesChange: (v: string) => void
  onApprove: () => void
  onRejectStart: () => void
  onRejectConfirm: () => void
  onRejectCancel: () => void
}) {
  const locationParts = [application.address, application.city, application.state, application.postal_code]
    .filter(Boolean)
    .join(', ')

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-lg">{application.org_name}</h3>
              <Badge className={statusColors[application.status]}>{application.status}</Badge>
              {application.sector && (
                <Badge variant="secondary">
                  {sectorLabels[application.sector] || application.sector}
                </Badge>
              )}
            </div>

            {/* Contact info */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                {application.contact_name} &lt;{application.contact_email}&gt;
              </span>
              {application.contact_phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {application.contact_phone}
                </span>
              )}
              {application.website && (
                <span className="flex items-center gap-1">
                  <Globe className="h-3.5 w-3.5" />
                  {application.website}
                </span>
              )}
            </div>

            {/* Org details */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {application.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  Org: {application.phone}
                </span>
              )}
              {application.hours && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {application.hours}
                </span>
              )}
              {locationParts && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {locationParts}
                </span>
              )}
            </div>

            {/* Description & services */}
            {application.description && (
              <p className="text-sm">{application.description}</p>
            )}
            {application.services && (
              <p className="text-sm text-muted-foreground">
                <strong>Services:</strong> {application.services}
              </p>
            )}

            {/* Reviewer notes (for rejected/approved) */}
            {application.reviewer_notes && (
              <p className="text-sm text-muted-foreground italic border-l-2 border-muted pl-3">
                Reviewer notes: {application.reviewer_notes}
              </p>
            )}

            {/* Submitted date */}
            <p className="text-xs text-muted-foreground">
              Submitted {new Date(application.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
              {application.reviewed_at && (
                <> &middot; Reviewed {new Date(application.reviewed_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}</>
              )}
            </p>
          </div>

          {/* Action buttons (pending only) */}
          {application.status === 'pending' && !isRejecting && (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" onClick={onApprove} disabled={isReviewing}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button variant="outline" size="sm" onClick={onRejectStart} disabled={isReviewing}>
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>

        {/* Reject confirmation */}
        {isRejecting && (
          <div className="mt-4 border-t pt-4 space-y-3">
            <label className="block text-sm font-medium">
              Reason for rejection (optional)
            </label>
            <textarea
              value={rejectNotes}
              onChange={(e) => onRejectNotesChange(e.target.value)}
              rows={2}
              placeholder="Add a note explaining the rejection..."
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="destructive"
                onClick={onRejectConfirm}
                disabled={isReviewing}
              >
                Confirm Rejection
              </Button>
              <Button size="sm" variant="ghost" onClick={onRejectCancel}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
