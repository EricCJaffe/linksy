'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

interface PurgeProviderDialogProps {
  providerId: string
  providerName: string
}

export function PurgeProviderDialog({ providerId, providerName }: PurgeProviderDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [confirmText, setConfirmText] = useState('')
  const [isPurging, setIsPurging] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const handlePurge = async () => {
    if (confirmText !== providerName) {
      toast({
        title: 'Confirmation failed',
        description: 'Provider name does not match. Please type the exact name.',
        variant: 'destructive',
      })
      return
    }

    setIsPurging(true)

    try {
      const res = await fetch(`/api/admin/providers/${providerId}/purge`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to purge provider')
      }

      const data = await res.json()

      toast({
        title: 'Provider purged',
        description: data.message,
      })

      // Redirect to providers list
      router.push('/dashboard/providers')
    } catch (error: any) {
      console.error('Purge error:', error)
      toast({
        title: 'Purge failed',
        description: error.message || 'An error occurred while purging the provider',
        variant: 'destructive',
      })
      setIsPurging(false)
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm" className="gap-2">
          <Trash2 className="h-4 w-4" />
          Purge Provider
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertDialogTitle>Permanently Delete Provider?</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-sm">
              <p className="font-semibold text-foreground">
                This action is irreversible and will permanently delete:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Provider record: <span className="font-medium text-foreground">{providerName}</span></li>
                <li>All locations ({' '} physical addresses)</li>
                <li>All contacts (staff members)</li>
                <li>All provider notes and attachments</li>
                <li>All referral tickets (active and historical)</li>
                <li>All events and calendar entries</li>
                <li>All service category associations</li>
                <li>All interaction analytics data</li>
                <li>References in search session history</li>
                <li>Any pending applications</li>
              </ul>
              <p className="font-semibold text-foreground pt-2">
                ⚠️ This data cannot be recovered. Consider using "Merge Provider" instead if duplicate records exist.
              </p>
              <div className="border-t pt-4">
                <Label htmlFor="confirm-name" className="text-foreground">
                  Type the provider name to confirm: <span className="font-mono text-sm">{providerName}</span>
                </Label>
                <Input
                  id="confirm-name"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Enter provider name exactly"
                  className="mt-2"
                  disabled={isPurging}
                />
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPurging}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handlePurge()
            }}
            disabled={confirmText !== providerName || isPurging}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isPurging ? 'Purging...' : 'Permanently Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
