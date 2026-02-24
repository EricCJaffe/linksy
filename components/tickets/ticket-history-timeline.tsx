'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTicketEvents } from '@/lib/hooks/useTicketEvents'
import { TicketEvent } from '@/lib/types/linksy'
import {
  FileText,
  UserCheck,
  ArrowRight,
  MessageSquare,
  Edit,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface TicketHistoryTimelineProps {
  ticketId: string
  ticketNumber: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

const EVENT_ICONS = {
  created: FileText,
  assigned: UserCheck,
  reassigned: ArrowRight,
  forwarded: ArrowRight,
  status_changed: Clock,
  comment_added: MessageSquare,
  updated: Edit,
}

const EVENT_COLORS = {
  created: 'text-green-600 dark:text-green-400',
  assigned: 'text-blue-600 dark:text-blue-400',
  reassigned: 'text-orange-600 dark:text-orange-400',
  forwarded: 'text-red-600 dark:text-red-400',
  status_changed: 'text-purple-600 dark:text-purple-400',
  comment_added: 'text-gray-600 dark:text-gray-400',
  updated: 'text-yellow-600 dark:text-yellow-400',
}

const EVENT_LABELS = {
  created: 'Created',
  assigned: 'Assigned',
  reassigned: 'Reassigned',
  forwarded: 'Forwarded',
  status_changed: 'Status Changed',
  comment_added: 'Comment Added',
  updated: 'Updated',
}

function EventIcon({ event }: { event: TicketEvent }) {
  const Icon = EVENT_ICONS[event.event_type] || AlertCircle
  const color = EVENT_COLORS[event.event_type] || 'text-gray-600'
  return <Icon className={`h-4 w-4 ${color}`} />
}

function EventDetails({ event }: { event: TicketEvent }) {
  const [expanded, setExpanded] = useState(false)

  const hasDetails =
    event.previous_state || event.new_state || event.reason || event.notes || event.metadata

  return (
    <div className="space-y-2">
      {/* Main event line */}
      <div className="flex items-center gap-2">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <EventIcon event={event} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{EVENT_LABELS[event.event_type]}</span>
            {event.actor && (
              <span className="text-sm text-muted-foreground">
                by {event.actor.full_name || event.actor.email}
              </span>
            )}
            {event.actor_type && (
              <Badge variant="outline" className="text-xs">
                {event.actor_type.replace('_', ' ')}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
            </span>
          </div>

          {/* Reason badge */}
          {event.reason && (
            <div className="mt-1">
              <Badge variant="secondary" className="text-xs">
                {event.reason.replace(/_/g, ' ')}
              </Badge>
            </div>
          )}

          {/* Notes preview */}
          {event.notes && !expanded && (
            <div className="mt-1 text-sm text-muted-foreground line-clamp-2">{event.notes}</div>
          )}
        </div>

        {/* Expand/collapse button */}
        {hasDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="ml-10 space-y-3 p-3 bg-muted/50 rounded-md text-sm">
          {event.notes && (
            <div>
              <div className="font-medium text-xs text-muted-foreground mb-1">Notes</div>
              <div className="text-foreground">{event.notes}</div>
            </div>
          )}

          {event.previous_state && Object.keys(event.previous_state).length > 0 && (
            <div>
              <div className="font-medium text-xs text-muted-foreground mb-1">Previous State</div>
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                {JSON.stringify(event.previous_state, null, 2)}
              </pre>
            </div>
          )}

          {event.new_state && Object.keys(event.new_state).length > 0 && (
            <div>
              <div className="font-medium text-xs text-muted-foreground mb-1">New State</div>
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                {JSON.stringify(event.new_state, null, 2)}
              </pre>
            </div>
          )}

          {event.metadata && Object.keys(event.metadata).length > 0 && (
            <div>
              <div className="font-medium text-xs text-muted-foreground mb-1">Metadata</div>
              <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function TicketHistoryTimeline({
  ticketId,
  ticketNumber,
  open,
  onOpenChange,
}: TicketHistoryTimelineProps) {
  const { data, isLoading, error } = useTicketEvents(ticketId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600" />
            Ticket History: #{ticketNumber}
          </DialogTitle>
          <DialogDescription>
            Complete audit trail of all events for this ticket
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto py-4">
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">Loading ticket history...</div>
          )}

          {error && (
            <div className="text-center py-8 text-destructive">
              Failed to load ticket history. Please try again.
            </div>
          )}

          {data && data.events.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No history available for this ticket.
            </div>
          )}

          {data && data.events.length > 0 && (
            <div className="space-y-4 relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

              {/* Events */}
              <div className="space-y-6">
                {data.events.map((event, index) => (
                  <div key={event.id} className="relative">
                    <EventDetails event={event} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
