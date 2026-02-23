'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle2, HelpCircle } from 'lucide-react'
import { useProviderAccess } from '@/lib/hooks/useProviderAccess'
import { SupportTicketsTab } from '@/components/support/support-tickets-tab'
import type { SupportTicketCategory, SupportTicketPriority } from '@/lib/types/linksy'

const categoryLabels: Record<SupportTicketCategory, string> = {
  technical: 'Technical Issue',
  account: 'Account & Access',
  billing: 'Billing Question',
  feature_request: 'Feature Request',
  other: 'Other',
}

const priorityLabels: Record<SupportTicketPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export default function SubmitSupportTicketPage() {
  const router = useRouter()
  const { data: providerAccess } = useProviderAccess()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [ticketNumber, setTicketNumber] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'other' as SupportTicketCategory,
    priority: 'medium' as SupportTicketPriority,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/support-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          provider_id: providerAccess?.provider?.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit ticket')
      }

      setTicketNumber(data.ticket_number)
      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Support Ticket Submitted!</h2>
            <p className="text-muted-foreground mb-4">
              Your support request has been received. Our team will review it and get back to you soon.
            </p>
            {ticketNumber && (
              <div className="p-4 bg-blue-50 rounded-lg mb-6">
                <p className="text-sm text-gray-700">
                  Ticket Number: <span className="font-mono font-semibold text-lg">{ticketNumber}</span>
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Save this number for your records
                </p>
              </div>
            )}
            <div className="flex gap-2 justify-center">
              <Button onClick={() => {
                setIsSuccess(false)
                setFormData({
                  subject: '',
                  description: '',
                  category: 'other',
                  priority: 'medium',
                })
              }}>
                Submit Another Ticket
              </Button>
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Return to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <HelpCircle className="h-8 w-8" />
          Submit Support Ticket
        </h1>
        <p className="text-muted-foreground mt-2">
          Need help with Linksy? Submit a support ticket and our team will assist you.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Support Request</CardTitle>
          <CardDescription>
            Describe your issue or question and we'll get back to you as soon as possible.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v as SupportTicketCategory })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(categoryLabels) as SupportTicketCategory[]).map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {categoryLabels[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(v) => setFormData({ ...formData, priority: v as SupportTicketPriority })}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(priorityLabels) as SupportTicketPriority[]).map((pri) => (
                      <SelectItem key={pri} value={pri}>
                        {priorityLabels[pri]}
                      </SelectItem>
                    ))}
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
                placeholder="Brief description of your issue"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Please provide as much detail as possible about your issue..."
                rows={6}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Support Ticket'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Support Tickets</CardTitle>
          <CardDescription>
            View the status of your existing support requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SupportTicketsTab />
        </CardContent>
      </Card>
    </div>
  )
}
