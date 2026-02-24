'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { RichTextDisplay } from '@/components/ui/rich-text-display'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Globe, Lock, Phone, Plus, Trash2, ArrowRight, UserCheck, Clock } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateTicket, useCreateTicketComment } from '@/lib/hooks/useTickets'
import { useCallLogs, useCreateCallLog, useDeleteCallLog } from '@/lib/hooks/useCallLogs'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import type { Ticket, TicketStatus } from '@/lib/types/linksy'
import { ForwardTicketDialog } from './forward-ticket-dialog'
import { AssignInternallyDialog } from './assign-internally-dialog'
import { TicketHistoryTimeline } from './ticket-history-timeline'

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
  const { data: currentUser } = useCurrentUser()
  const [commentText, setCommentText] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [showForwardDialog, setShowForwardDialog] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)

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

      {/* Ticket Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ticket Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {/* Forward button - available to provider contacts */}
            {ticket.provider_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForwardDialog(true)}
                className="flex items-center gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                Forward Ticket
              </Button>
            )}

            {/* Assign internally - available to provider admins */}
            {ticket.provider_id && (currentUser?.profile as any)?.is_site_admin && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAssignDialog(true)}
                className="flex items-center gap-2"
              >
                <UserCheck className="h-4 w-4" />
                Assign Internally
              </Button>
            )}

            {/* History - available to all */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistoryDialog(true)}
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              View History
            </Button>
          </div>
        </CardContent>
      </Card>

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
                  <RichTextDisplay content={comment.content} />
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}

          {/* Add comment form */}
          <div className="space-y-3 border-t pt-4">
            <RichTextEditor
              value={commentText}
              onChange={setCommentText}
              placeholder="Add a comment..."
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

      {/* Call Logs */}
      <CallLogSection ticketId={ticket.id} providerId={ticket.provider_id || undefined} />

      {/* Dialogs */}
      <ForwardTicketDialog
        ticketId={ticket.id}
        ticketNumber={ticket.ticket_number}
        open={showForwardDialog}
        onOpenChange={setShowForwardDialog}
      />

      {ticket.provider_id && (
        <AssignInternallyDialog
          ticketId={ticket.id}
          ticketNumber={ticket.ticket_number}
          providerId={ticket.provider_id}
          open={showAssignDialog}
          onOpenChange={setShowAssignDialog}
        />
      )}

      <TicketHistoryTimeline
        ticketId={ticket.id}
        ticketNumber={ticket.ticket_number}
        open={showHistoryDialog}
        onOpenChange={setShowHistoryDialog}
      />
    </div>
  )
}

function CallLogSection({ ticketId, providerId }: { ticketId: string; providerId?: string }) {
  const { data, isLoading } = useCallLogs(ticketId)
  const createCallLog = useCreateCallLog()
  const deleteCallLog = useDeleteCallLog()
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState({
    caller_name: '',
    call_type: 'outbound' as 'inbound' | 'outbound',
    duration_minutes: '',
    notes: '',
  })

  const handleSubmit = () => {
    createCallLog.mutate(
      {
        ticket_id: ticketId,
        provider_id: providerId,
        caller_name: form.caller_name || undefined,
        call_type: form.call_type,
        duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes, 10) : undefined,
        notes: form.notes || undefined,
      },
      {
        onSuccess: () => {
          setForm({ caller_name: '', call_type: 'outbound', duration_minutes: '', notes: '' })
          setIsAdding(false)
        },
      }
    )
  }

  const callLogs = data?.callLogs || []

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4" />
            Call Logs {callLogs.length > 0 && `(${callLogs.length})`}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setIsAdding(!isAdding)}>
            <Plus className="h-4 w-4 mr-1" />
            Log Call
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isAdding && (
          <div className="space-y-3 rounded-md border p-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <Label>Caller Name</Label>
                <Input
                  value={form.caller_name}
                  onChange={(e) => setForm({ ...form, caller_name: e.target.value })}
                  placeholder="Caller name"
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.call_type} onValueChange={(v) => setForm({ ...form, call_type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inbound">Inbound</SelectItem>
                    <SelectItem value="outbound">Outbound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                  placeholder="Minutes"
                />
              </div>
            </div>
            <div>
              <Label>Notes</Label>
              <RichTextEditor
                value={form.notes}
                onChange={(v) => setForm({ ...form, notes: v })}
                placeholder="Call notes..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={createCallLog.isPending}>
                {createCallLog.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading call logs...</p>
        ) : callLogs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No call logs yet.</p>
        ) : (
          <div className="space-y-3">
            {callLogs.map((log) => (
              <div key={log.id} className="rounded-md border p-3 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <Badge variant={log.call_type === 'inbound' ? 'default' : 'secondary'}>
                    {log.call_type === 'inbound' ? 'Inbound' : 'Outbound'}
                  </Badge>
                  {log.caller_name && <span className="font-medium">{log.caller_name}</span>}
                  {log.duration_minutes && (
                    <span className="text-muted-foreground">{log.duration_minutes} min</span>
                  )}
                  <span className="text-muted-foreground ml-auto">
                    {log.creator?.full_name || log.creator?.email || 'Unknown'} — {new Date(log.created_at).toLocaleString()}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      if (confirm('Delete this call log?')) deleteCallLog.mutate(log.id)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                {log.notes && <RichTextDisplay content={log.notes} />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
