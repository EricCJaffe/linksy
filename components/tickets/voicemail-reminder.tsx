'use client'

import { useEffect, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Phone } from 'lucide-react'

const SESSION_KEY = 'linksy_voicemail_reminder_shown'

/**
 * Voicemail reminder popup — shown once per session on referral submit.
 * "Check your voicemail — IS IT WORKING? IS IT FULL?"
 */
export function useVoicemailReminder() {
  const [showReminder, setShowReminder] = useState(false)

  const triggerReminder = () => {
    if (typeof window === 'undefined') return
    const shown = sessionStorage.getItem(SESSION_KEY)
    if (!shown) {
      setShowReminder(true)
      sessionStorage.setItem(SESSION_KEY, 'true')
    }
  }

  const dismissReminder = () => {
    setShowReminder(false)
  }

  return { showReminder, triggerReminder, dismissReminder }
}

export function VoicemailReminderDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-amber-600" />
            Voicemail Reminder
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p className="text-base font-semibold text-foreground">
                Check your voicemail before submitting!
              </p>
              <div className="rounded-md bg-amber-50 border border-amber-200 p-4 space-y-2">
                <p className="text-sm text-amber-900 font-medium">
                  IS IT WORKING? IS IT FULL?
                </p>
                <p className="text-sm text-amber-800">
                  Please verify that the provider&apos;s voicemail is set up, active, and has space
                  for new messages. Clients may not be able to leave a message if the mailbox is full
                  or not configured.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onClose}>
            Got it, continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
