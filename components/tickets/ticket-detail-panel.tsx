'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Globe, Lock } from 'lucide-react'
import { useUpdateTicket, useCreateTicketComment } from '@/lib/hooks/useTickets'
import type { Ticket, TicketStatus } from '@/lib/types/linksy'

interface TicketDetailPanelProps {
  ticket: Ticket
}

const ticketStatusLabels: Record<TicketStatus, string> = {
  pending: 'Pending',
  customer_need_addressed: 'Need Addressed',
  wrong_organization_referred: 'Wrong Org Referred',
  outside_of_scope: 'Out of Scope',
  client_not_eligible: 'Not Eligible',
  unable_to_assist: 'Unable to Assist',
  client_unresponsive: 'Unresponsive',
}

const ticketStatusVariant: Record<TicketStatus, string> = {
  pending: 'default',
  customer_need_addressed: 'outline',
  wrong_organization_referred: 'outline',
  outside_of_scope: 'secondary',
  client_not_eligible: 'secondary',
  unable_to_assist: 'destructive',
  client_unresponsive: 'secondary',
}

const ticketStatusClass: Record<string, string> = {
  customer_need_addressed: 'border-green-500 text-green-700 bg-green-50',
  wrong_organization_referred: 'border-orange-500 text-orange-700 bg-orange-50',
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const variant = ticketStatusVariant[status] as any
  const extraClass = ticketStatusClass[status] || ''
  return (
    <Badge variant={variant} className={extraClass}>
      {ticketStatusLabels[status] || status}
    </Badge>
  )
}

export function TicketDetailPanel({ ticket }: TicketDetailPanelProps) {
  const updateTicket = useUpdateTicket()
  const createComment = useCreateTicketComment()
  const [commentText, setCommentText] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)

  const handleStatusChange = (newStatus: string) => {
    updateTicket.mutate({ id: ticket.id, status: newStatus as TicketStatus })
  }

  const handleAddComment = () => {
    if (!commentText.trim()) return
    createComment.mutate(
      { ticketId: ticket.id, content: commentText.trim(), is_private: isPrivate },
      {
        onSuccess: () => {
          setCommentText('')
          setIsPrivate(false)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">#{ticket.ticket_number}</h2>
          <StatusBadge status={ticket.status} />
          {ticket.source === 'public_search' && (
            <Badge variant="outline" className="border-blue-500 text-blue-700 bg-blue-50">
              <Globe className="h-3 w-3 mr-1" />
              Public Search
            </Badge>
          )}
        </div>
        <Select value={ticket.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Change status" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ticketStatusLabels) as TicketStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {ticketStatusLabels[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Client & Details */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Name</span>
              <span>{ticket.client_name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Phone</span>
              <span>{ticket.client_phone || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{ticket.client_email || '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ticket Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider</span>
              <span>{ticket.provider?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Need</span>
              <span>{ticket.need?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Source</span>
              <span>{ticket.source || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Follow-up Sent</span>
              <span>{ticket.follow_up_sent ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Description */}
      {ticket.description_of_need && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Description of Need</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{ticket.description_of_need}</p>
          </CardContent>
        </Card>
      )}

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Comments {ticket.comments && ticket.comments.length > 0 && `(${ticket.comments.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.comments && ticket.comments.length > 0 ? (
            <div className="space-y-3">
              {ticket.comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`rounded-md border p-3 text-sm ${
                    comment.is_private
                      ? 'bg-amber-50 border-amber-200'
                      : ''
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="font-medium">
                      {comment.author_name || 'Unknown'}
                    </span>
                    {comment.author_role && (
                      <Badge variant="secondary" className="text-xs">
                        {comment.author_role}
                      </Badge>
                    )}
                    {comment.is_private && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        <Lock className="h-3 w-3" /> Private
                      </span>
                    )}
                    <span className="text-muted-foreground">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap">{comment.content}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}

          {/* Add comment form */}
          <div className="space-y-3 border-t pt-4">
            <Textarea
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={isPrivate}
                  onCheckedChange={(checked) => setIsPrivate(checked === true)}
                />
                <Lock className="h-3 w-3" /> Private comment (site admins only)
              </label>
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!commentText.trim() || createComment.isPending}
              >
                {createComment.isPending ? 'Adding...' : 'Add Comment'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
