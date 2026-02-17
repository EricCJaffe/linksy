'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useSupportTicket, useCreateSupportTicketComment } from '@/lib/hooks/useSupportTickets'
import { AlertCircle, ArrowLeft, Send } from 'lucide-react'
import type { SupportTicketStatus, SupportTicketPriority } from '@/lib/types/linksy'

const statusColors: Record<SupportTicketStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
}

const priorityColors: Record<SupportTicketPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

export default function SupportTicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string
  const [comment, setComment] = useState('')

  const { data: ticket, isLoading, error } = useSupportTicket(ticketId)
  const createComment = useCreateSupportTicketComment()

  const handleAddComment = async () => {
    if (!comment.trim()) return

    try {
      await createComment.mutateAsync({
        ticketId,
        content: comment.trim(),
        is_internal: false,
      })
      setComment('')
    } catch (err) {
      console.error('Failed to add comment:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load support ticket.</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Support Ticket Details</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">{ticket.ticket_number}</span>
                <Badge className={statusColors[ticket.status]}>
                  {ticket.status.replace('_', ' ')}
                </Badge>
                <Badge className={priorityColors[ticket.priority]}>
                  {ticket.priority}
                </Badge>
                {ticket.category && (
                  <Badge variant="outline">{ticket.category.replace('_', ' ')}</Badge>
                )}
              </div>
              <CardTitle className="text-2xl">{ticket.subject}</CardTitle>
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date(ticket.created_at).toLocaleDateString()}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold mb-2">Description</h3>
              <p className="text-sm whitespace-pre-wrap">{ticket.description}</p>
            </div>

            {ticket.provider && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Provider</h3>
                <p className="text-sm text-muted-foreground">{ticket.provider.name}</p>
              </div>
            )}

            {ticket.resolved_at && (
              <div>
                <h3 className="text-sm font-semibold mb-1">Resolved At</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(ticket.resolved_at).toLocaleString()}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.comments && ticket.comments.length > 0 ? (
            <div className="space-y-4">
              {ticket.comments
                .filter((c) => !c.is_internal)
                .map((c) => (
                  <div key={c.id} className="border-l-2 border-primary pl-4 py-2">
                    <div className="flex items-start justify-between mb-2">
                      <span className="font-semibold text-sm">{c.author_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{c.content}</p>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No comments yet.</p>
          )}

          {ticket.status !== 'closed' && (
            <div className="space-y-2 pt-4 border-t">
              <Textarea
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleAddComment}
                disabled={!comment.trim() || createComment.isPending}
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                {createComment.isPending ? 'Sending...' : 'Send Comment'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
