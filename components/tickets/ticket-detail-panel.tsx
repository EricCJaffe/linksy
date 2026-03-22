'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
import { Globe, Lock, Phone, Plus, Trash2, ArrowRight, UserCheck, Clock, Pencil, X as XIcon, Timer, Square, Play, PhoneIncoming, PhoneOutgoing } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateTicket, useCreateTicketComment, useUpdateCommentPrivacy, useUpdateComment } from '@/lib/hooks/useTickets'
import { useCallLogs, useCreateCallLog, useDeleteCallLog } from '@/lib/hooks/useCallLogs'
import { useCurrentUser } from '@/lib/hooks/useCurrentUser'
import { useUndoableAction } from '@/lib/hooks/useUndoableAction'
import type { Ticket, TicketStatus } from '@/lib/types/linksy'
import { formatPhone } from '@/lib/utils/phone'
import { ForwardTicketDialog } from './forward-ticket-dialog'
import { AssignInternallyDialog } from './assign-internally-dialog'
import { TicketHistoryTimeline } from './ticket-history-timeline'

interface TicketDetailPanelProps {
  ticket: Ticket
}

const ticketStatusLabels: Record<TicketStatus, string> = {
  pending: 'Pending',
  in_process: 'In Process',
  customer_need_addressed: 'Service Provided',
  wrong_organization_referred: 'Wrong Org Referred',
  outside_of_scope: 'Out of Scope',
  client_not_eligible: 'Not Eligible',
  unable_to_assist: 'Unable to Assist',
  client_unresponsive: 'Unresponsive',
  transferred_another_provider: 'Transferred',
  transferred_pending: 'Transferred Pending',
}

const ticketStatusVariant: Record<TicketStatus, string> = {
  pending: 'default',
  in_process: 'outline',
  customer_need_addressed: 'outline',
  wrong_organization_referred: 'outline',
  outside_of_scope: 'secondary',
  client_not_eligible: 'secondary',
  unable_to_assist: 'destructive',
  client_unresponsive: 'secondary',
  transferred_another_provider: 'secondary',
  transferred_pending: 'default',
}

const ticketStatusClass: Record<string, string> = {
  in_process: 'border-yellow-500 text-yellow-700 bg-yellow-50',
  customer_need_addressed: 'border-green-500 text-green-700 bg-green-50',
  wrong_organization_referred: 'border-orange-500 text-orange-700 bg-orange-50',
  transferred_another_provider: 'border-gray-500 text-gray-700 bg-gray-50',
  transferred_pending: 'border-blue-500 text-blue-700 bg-blue-50',
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
  const updateCommentPrivacy = useUpdateCommentPrivacy()
  const updateComment = useUpdateComment()
  const { data: currentUser } = useCurrentUser()
  const [commentText, setCommentText] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const isSiteAdmin = !!(currentUser?.profile as any)?.is_site_admin
  const [showForwardDialog, setShowForwardDialog] = useState(false)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const { execute: undoableAction } = useUndoableAction()

  const handleStatusChange = (newStatus: string) => {
    const previousStatus = ticket.status
    undoableAction({
      description: `Status changed to ${ticketStatusLabels[newStatus as TicketStatus] || newStatus}`,
      action: () => {
        updateTicket.mutate({ id: ticket.id, status: newStatus as TicketStatus })
      },
      undoAction: () => {
        updateTicket.mutate({ id: ticket.id, status: previousStatus })
      },
    })
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
          {ticket.is_test && (
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">TEST</Badge>
          )}
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
          <CardTitle className="text-base">Referral Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {/* Transfer button - available to provider contacts */}
            {ticket.provider_id && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowForwardDialog(true)}
                className="flex items-center gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                Transfer Referral
              </Button>
            )}

            {/* Assign internally - available to provider admins */}
            {ticket.provider_id && isSiteAdmin && (
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
              <span>{ticket.client_phone ? formatPhone(ticket.client_phone) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <span>{ticket.client_email || '-'}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Referral Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider</span>
              <span>{ticket.provider?.name || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service</span>
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
          {/* Add comment form — at top for quick access */}
          <div className="space-y-3">
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

          {ticket.comments && ticket.comments.length > 0 ? (
            <div className="space-y-3 border-t pt-4">
              {[...ticket.comments].reverse().map((comment) => (
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
                    {comment.updated_at && comment.updated_at !== comment.created_at && (
                      <span className="text-xs text-muted-foreground italic">
                        (edited {new Date(comment.updated_at).toLocaleString()})
                      </span>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      {(isSiteAdmin || comment.author_id === currentUser?.id) && editingCommentId !== comment.id && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCommentId(comment.id)
                            setEditCommentText(comment.content)
                          }}
                          title="Edit comment"
                          className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent text-muted-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {isSiteAdmin && (
                        <button
                          type="button"
                          onClick={() =>
                            undoableAction({
                              description: `Comment marked as ${comment.is_private ? 'public' : 'private'}`,
                              action: () => {
                                updateCommentPrivacy.mutate({
                                  ticketId: ticket.id,
                                  commentId: comment.id,
                                  is_private: !comment.is_private,
                                })
                              },
                              undoAction: () => {
                                updateCommentPrivacy.mutate({
                                  ticketId: ticket.id,
                                  commentId: comment.id,
                                  is_private: !!comment.is_private,
                                })
                              },
                            })
                          }
                          title={comment.is_private ? 'Make public' : 'Make private'}
                          className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-accent text-muted-foreground"
                        >
                          {comment.is_private ? <Lock className="h-3.5 w-3.5 text-amber-600" /> : <Globe className="h-3.5 w-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="space-y-2 mt-2">
                      <RichTextEditor
                        value={editCommentText}
                        onChange={setEditCommentText}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingCommentId(null)}
                        >
                          <XIcon className="h-3 w-3 mr-1" /> Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={!editCommentText.trim() || updateComment.isPending}
                          onClick={() => {
                            updateComment.mutate(
                              { ticketId: ticket.id, commentId: comment.id, content: editCommentText },
                              { onSuccess: () => setEditingCommentId(null) }
                            )
                          }}
                        >
                          {updateComment.isPending ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <RichTextDisplay content={comment.content} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground border-t pt-4">No comments yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Call Logs */}
      <CallLogSection ticketId={ticket.id} providerId={ticket.provider_id || undefined} />

      {/* Dialogs */}
      <ForwardTicketDialog
        ticketId={ticket.id}
        ticketNumber={ticket.ticket_number}
        reassignmentCount={ticket.reassignment_count}
        isSiteAdmin={isSiteAdmin}
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

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return ''
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function CallLogSection({ ticketId, providerId }: { ticketId: string; providerId?: string }) {
  const { data, isLoading } = useCallLogs(ticketId)
  const createCallLog = useCreateCallLog()
  const deleteCallLog = useDeleteCallLog()

  // Form state
  const [isAdding, setIsAdding] = useState(false)
  const [entryMode, setEntryMode] = useState<'timer' | 'manual'>('timer')
  const [form, setForm] = useState({
    caller_name: '',
    call_type: '' as '' | 'inbound' | 'outbound',
    notes: '',
    // Manual entry fields
    manual_start: '',
    manual_end: '',
  })

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false)
  const [timerStartedAt, setTimerStartedAt] = useState<Date | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [])

  // Timer tick
  useEffect(() => {
    if (timerRunning && timerStartedAt) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - timerStartedAt.getTime()) / 1000))
      }, 1000)
      return () => {
        if (intervalRef.current) clearInterval(intervalRef.current)
      }
    }
  }, [timerRunning, timerStartedAt])

  const startTimer = useCallback((callType: 'inbound' | 'outbound') => {
    const now = new Date()
    setForm((prev) => ({ ...prev, call_type: callType }))
    setTimerStartedAt(now)
    setElapsed(0)
    setTimerRunning(true)
    setIsAdding(true)
    setEntryMode('timer')
  }, [])

  const endTimer = useCallback(() => {
    setTimerRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const resetForm = useCallback(() => {
    setForm({ caller_name: '', call_type: '', notes: '', manual_start: '', manual_end: '' })
    setTimerRunning(false)
    setTimerStartedAt(null)
    setElapsed(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
    setIsAdding(false)
  }, [])

  // Calculate duration from manual start/end
  const manualDurationMinutes = (() => {
    if (!form.manual_start || !form.manual_end) return null
    const start = new Date(form.manual_start).getTime()
    const end = new Date(form.manual_end).getTime()
    if (isNaN(start) || isNaN(end) || end <= start) return null
    return Math.round((end - start) / 60000)
  })()

  const handleSubmit = () => {
    const callType = form.call_type || 'outbound'
    let startedAt: string | undefined
    let endedAt: string | undefined
    let durationMinutes: number | undefined

    if (entryMode === 'timer' && timerStartedAt) {
      startedAt = timerStartedAt.toISOString()
      endedAt = new Date().toISOString()
      durationMinutes = Math.max(1, Math.round(elapsed / 60))
    } else if (entryMode === 'manual' && form.manual_start && form.manual_end) {
      startedAt = new Date(form.manual_start).toISOString()
      endedAt = new Date(form.manual_end).toISOString()
      durationMinutes = manualDurationMinutes ?? undefined
    }

    createCallLog.mutate(
      {
        ticket_id: ticketId,
        provider_id: providerId,
        caller_name: form.caller_name || undefined,
        call_type: callType,
        duration_minutes: durationMinutes,
        started_at: startedAt,
        ended_at: endedAt,
        notes: form.notes || undefined,
      },
      { onSuccess: resetForm }
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
          <div className="flex items-center gap-2">
            {/* Quick-start timer buttons */}
            {!timerRunning && !isAdding && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startTimer('inbound')}
                  className="flex items-center gap-1.5"
                >
                  <PhoneIncoming className="h-4 w-4" />
                  Inbound
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => startTimer('outbound')}
                  className="flex items-center gap-1.5"
                >
                  <PhoneOutgoing className="h-4 w-4" />
                  Outbound
                </Button>
              </>
            )}
            {!timerRunning && !isAdding && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setIsAdding(true)
                  setEntryMode('manual')
                }}
              >
                <Plus className="h-4 w-4 mr-1" />
                Manual
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active timer banner */}
        {timerRunning && (
          <div className="flex items-center justify-between rounded-md border-2 border-green-500 bg-green-50 p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500 text-white animate-pulse">
                <Timer className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-medium text-green-800">
                  {form.call_type === 'inbound' ? 'Inbound' : 'Outbound'} Call in Progress
                </div>
                <div className="font-mono text-2xl font-bold text-green-900">
                  {formatElapsed(elapsed)}
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="destructive"
              onClick={endTimer}
              className="flex items-center gap-1.5"
            >
              <Square className="h-3 w-3" />
              End Call
            </Button>
          </div>
        )}

        {/* Form (shown when adding or when timer stopped with data) */}
        {isAdding && (
          <div className="space-y-3 rounded-md border p-3">
            {/* Entry mode tabs */}
            {!timerRunning && !timerStartedAt && (
              <div className="flex gap-1 rounded-md bg-muted p-1 w-fit">
                <button
                  type="button"
                  onClick={() => setEntryMode('timer')}
                  className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                    entryMode === 'timer' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Timer className="h-3.5 w-3.5 inline mr-1" />
                  Timer
                </button>
                <button
                  type="button"
                  onClick={() => setEntryMode('manual')}
                  className={`rounded px-3 py-1 text-sm font-medium transition-colors ${
                    entryMode === 'manual' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Clock className="h-3.5 w-3.5 inline mr-1" />
                  Manual
                </button>
              </div>
            )}

            {/* Timer mode - start buttons when no timer yet */}
            {entryMode === 'timer' && !timerRunning && !timerStartedAt && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => startTimer('inbound')}
                  className="flex items-center gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  <PhoneIncoming className="h-3.5 w-3.5" />
                  Start Inbound
                </Button>
                <Button
                  size="sm"
                  onClick={() => startTimer('outbound')}
                  className="flex items-center gap-1.5"
                >
                  <Play className="h-3.5 w-3.5" />
                  <PhoneOutgoing className="h-3.5 w-3.5" />
                  Start Outbound
                </Button>
              </div>
            )}

            {/* Timer stopped - show computed duration */}
            {entryMode === 'timer' && !timerRunning && timerStartedAt && (
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                  <Clock className="h-3 w-3 mr-1" />
                  Duration: {formatElapsed(elapsed)} ({Math.max(1, Math.round(elapsed / 60))} min)
                </Badge>
              </div>
            )}

            {/* Manual mode - start/end time inputs */}
            {entryMode === 'manual' && (
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <Label>Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={form.manual_start}
                    onChange={(e) => setForm({ ...form, manual_start: e.target.value })}
                  />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input
                    type="datetime-local"
                    value={form.manual_end}
                    onChange={(e) => setForm({ ...form, manual_end: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Duration</Label>
                  <div className="flex h-10 items-center rounded-md border bg-muted/50 px-3 text-sm">
                    {manualDurationMinutes != null
                      ? formatDuration(manualDurationMinutes)
                      : <span className="text-muted-foreground">Auto-calculated</span>
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Shared fields */}
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Caller Name</Label>
                <Input
                  value={form.caller_name}
                  onChange={(e) => setForm({ ...form, caller_name: e.target.value })}
                  placeholder="Caller name"
                />
              </div>
              {entryMode === 'manual' && (
                <div>
                  <Label>Type</Label>
                  <Select
                    value={form.call_type || undefined}
                    onValueChange={(v) => setForm({ ...form, call_type: v as 'inbound' | 'outbound' })}
                  >
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbound">Inbound</SelectItem>
                      <SelectItem value="outbound">Outbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
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
              <Button size="sm" variant="outline" onClick={resetForm}>Cancel</Button>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={
                  createCallLog.isPending ||
                  timerRunning ||
                  (!form.call_type && entryMode === 'manual') ||
                  (entryMode === 'manual' && (!form.manual_start || !form.manual_end || manualDurationMinutes === null))
                }
              >
                {createCallLog.isPending ? 'Saving...' : 'Save Call Log'}
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
                <div className="mb-1 flex items-center gap-2 flex-wrap">
                  <Badge variant={log.call_type === 'inbound' ? 'default' : 'secondary'}>
                    {log.call_type === 'inbound' ? (
                      <><PhoneIncoming className="h-3 w-3 mr-1" />Inbound</>
                    ) : (
                      <><PhoneOutgoing className="h-3 w-3 mr-1" />Outbound</>
                    )}
                  </Badge>
                  {log.caller_name && <span className="font-medium">{log.caller_name}</span>}
                  {log.duration_minutes != null && log.duration_minutes > 0 && (
                    <Badge variant="outline" className="font-mono text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDuration(log.duration_minutes)}
                    </Badge>
                  )}
                  {log.started_at && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(log.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {log.ended_at && (
                        <> – {new Date(log.ended_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</>
                      )}
                    </span>
                  )}
                  <span className="text-muted-foreground ml-auto text-xs">
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
