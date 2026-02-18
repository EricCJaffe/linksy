'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Calendar, CheckCircle, XCircle, LayoutList, CalendarDays } from 'lucide-react'
import { useAdminEvents, useApproveEvent, useRejectEvent } from '@/lib/hooks/useAdminEvents'
import { EventCalendar, formatRecurrence } from '@/components/providers/event-calendar'
import { RefreshCw } from 'lucide-react'

export default function AdminEventsPage() {
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [calendarView, setCalendarView] = useState(false)
  const { data: events, isLoading, error } = useAdminEvents(statusFilter)
  const { data: allEvents } = useAdminEvents('all')
  const approveEvent = useApproveEvent()
  const rejectEvent = useRejectEvent()

  const counts = {
    pending: allEvents?.filter(e => e.status === 'pending').length ?? 0,
    approved: allEvents?.filter(e => e.status === 'approved').length ?? 0,
    rejected: allEvents?.filter(e => e.status === 'rejected').length ?? 0,
    all: allEvents?.length ?? 0,
  }

  const handleApprove = async (eventId: string) => {
    await approveEvent.mutateAsync(eventId)
  }

  const handleReject = async (eventId: string) => {
    if (confirm('Are you sure you want to reject this event?')) {
      await rejectEvent.mutateAsync(eventId)
    }
  }

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-800',
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Events Management</h1>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load events. Please try again.</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Calendar className="h-8 w-8" />
          Events Management
        </h1>
        <p className="text-muted-foreground mt-1">
          Review and approve provider events
        </p>
      </div>

      {/* View toggle + Status Filter Tabs */}
      <div className="flex items-center justify-between gap-2 border-b pb-0">
        <div className="flex gap-2">
          {([
            { key: 'pending', label: 'Pending', badgeClass: 'bg-yellow-100 text-yellow-800' },
            { key: 'approved', label: 'Approved', badgeClass: 'bg-green-100 text-green-800' },
            { key: 'rejected', label: 'Rejected', badgeClass: 'bg-red-100 text-red-800' },
            { key: 'all', label: 'All', badgeClass: 'bg-muted text-muted-foreground' },
          ] as const).map(({ key, label, badgeClass }) => (
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
        <div className="flex items-center gap-1 border rounded-md p-0.5 mb-1">
          <Button
            variant={calendarView ? 'ghost' : 'secondary'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setCalendarView(false)}
          >
            <LayoutList className="h-4 w-4 mr-1" />
            List
          </Button>
          <Button
            variant={calendarView ? 'secondary' : 'ghost'}
            size="sm"
            className="h-7 px-2"
            onClick={() => setCalendarView(true)}
          >
            <CalendarDays className="h-4 w-4 mr-1" />
            Calendar
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : !events || events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No {statusFilter === 'all' ? '' : statusFilter} events found.
          </CardContent>
        </Card>
      ) : calendarView ? (
        <EventCalendar events={events} showProvider />
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const recurrenceLabel = formatRecurrence(event.recurrence_rule)
            return (
              <Card key={event.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{event.title}</h3>
                        <Badge className={statusColors[event.status]}>{event.status}</Badge>
                        {event.is_public && <Badge variant="outline">Public</Badge>}
                        {recurrenceLabel && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                            <RefreshCw className="h-3 w-3" />
                            {recurrenceLabel}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.provider?.name}
                      </p>
                      <p className="text-sm font-medium mt-1">
                        {new Date(event.event_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      {event.location && (
                        <p className="text-sm text-muted-foreground">{event.location}</p>
                      )}
                      {event.description && (
                        <p className="mt-2 text-sm">{event.description}</p>
                      )}
                    </div>
                    {event.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(event.id)}
                          disabled={approveEvent.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(event.id)}
                          disabled={rejectEvent.isPending}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
