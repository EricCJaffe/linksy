'use client'

import { useState } from 'react'
import { FlaskConical } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface SendTestReferralDialogProps {
  providerId: string
  providerName: string
}

const TEST_CLIENT = {
  client_name: 'Mega Coolmint',
  client_email: 'Linksy@impactworks.org',
  client_phone: '1-904-330-1848',
}

export function SendTestReferralDialog({ providerId, providerName }: SendTestReferralDialogProps) {
  const { toast } = useToast()
  const [isSending, setIsSending] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handleSend = async () => {
    setIsSending(true)

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: providerId,
          ...TEST_CLIENT,
          description_of_need: 'Test referral for verification purposes.',
          is_test: true,
        }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Failed to create test referral')
      }

      const data = await res.json()

      toast({
        title: 'Test referral created',
        description: `Referral ${data.ticket_number || ''} sent to ${providerName}.`,
      })

      setIsOpen(false)
    } catch (error: any) {
      toast({
        title: 'Failed to create test referral',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FlaskConical className="h-4 w-4" />
          Send Test Referral
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            Send Test Referral
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm">
              <p>
                This will create a test referral for <span className="font-medium text-foreground">{providerName}</span> with the following pre-populated data:
              </p>
              <div className="rounded-md border bg-muted/50 p-3 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Client Name</span>
                  <span className="font-medium text-foreground">{TEST_CLIENT.client_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-foreground">{TEST_CLIENT.client_email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium text-foreground">{TEST_CLIENT.client_phone}</span>
                </div>
              </div>
              <p className="text-muted-foreground">
                The referral will be flagged as a test and excluded from analytics.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleSend()
            }}
            disabled={isSending}
          >
            {isSending ? 'Sending...' : 'Send Test Referral'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
