'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, CheckCircle2 } from 'lucide-react'

interface CreateTicketDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string
  providerName: string
  needId?: string
  needName?: string
}

export function CreateTicketDialog({
  open,
  onOpenChange,
  providerId,
  providerName,
  needId,
  needName,
}: CreateTicketDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [ticketNumber, setTicketNumber] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    description_of_need: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/linksy/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: providerId,
          need_id: needId,
          ...formData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit request')
      }

      setTicketNumber(data.ticket_number)
      setIsSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset form after closing
    setTimeout(() => {
      setIsSuccess(false)
      setTicketNumber(null)
      setError(null)
      setFormData({
        client_name: '',
        client_phone: '',
        client_email: '',
        description_of_need: '',
      })
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {isSuccess ? (
          <div className="text-center py-6">
            <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <DialogHeader>
              <DialogTitle className="text-2xl mb-2">Request Submitted!</DialogTitle>
              <DialogDescription className="text-base">
                Your referral request has been submitted to <strong>{providerName}</strong>.
              </DialogDescription>
            </DialogHeader>
            {ticketNumber && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-700">
                  Reference Number: <span className="font-mono font-semibold">{ticketNumber}</span>
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Save this number for your records
                </p>
              </div>
            )}
            <Button onClick={handleClose} className="mt-6">
              Close
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Request Referral</DialogTitle>
              <DialogDescription>
                Submit a referral request to <strong>{providerName}</strong>
                {needName && ` for ${needName}`}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client_name">
                  Your Name <span className="text-gray-500 text-sm">(Optional)</span>
                </Label>
                <Input
                  id="client_name"
                  value={formData.client_name}
                  onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                  placeholder="Leave blank to remain anonymous"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_phone">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="client_phone"
                  type="tel"
                  value={formData.client_phone}
                  onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                  placeholder="(555) 555-5555"
                  required={!formData.client_email}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="client_email">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="client_email"
                  type="email"
                  value={formData.client_email}
                  onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                  placeholder="your@email.com"
                  required={!formData.client_phone}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description_of_need">
                  Additional Details <span className="text-gray-500 text-sm">(Optional)</span>
                </Label>
                <Textarea
                  id="description_of_need"
                  value={formData.description_of_need}
                  onChange={(e) => setFormData({ ...formData, description_of_need: e.target.value })}
                  placeholder="Tell us more about your situation or specific needs..."
                  rows={4}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
