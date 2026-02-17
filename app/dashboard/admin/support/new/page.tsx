'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import type { SupportTicketPriority, SupportTicketCategory } from '@/lib/types/linksy'

export default function AdminCreateSupportTicketPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ticketNumber, setTicketNumber] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'other' as SupportTicketCategory,
    priority: 'medium' as SupportTicketPriority,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create support ticket')
      }

      const ticket = await res.json()
      setTicketNumber(ticket.ticket_number)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsSubmitting(false)
    }
  }

  if (ticketNumber) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-8 w-8 text-green-600 flex-shrink-0 mt-1" />
              <div className="space-y-3">
                <h2 className="text-xl font-semibold text-green-900">
                  Support Ticket Created Successfully
                </h2>
                <p className="text-green-800">
                  Your support ticket has been created with number:{' '}
                  <span className="font-mono font-bold">{ticketNumber}</span>
                </p>
                <p className="text-sm text-green-700">
                  You can track the status and add comments to this ticket from the support tickets list.
                </p>
                <div className="flex gap-3 pt-2">
                  <Button onClick={() => router.push('/dashboard/admin/support')}>
                    View All Tickets
                  </Button>
                  <Button variant="outline" onClick={() => router.back()}>
                    Go Back
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/admin/support')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Support Tickets
        </Button>
        <h1 className="text-3xl font-bold">Create Support Ticket</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submit a New Support Ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value as SupportTicketCategory })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="account">Account</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="feature_request">Feature Request</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value as SupportTicketPriority })
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief summary of your issue"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detailed description of your issue"
                rows={6}
                required
              />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Creating Ticket...' : 'Create Support Ticket'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
