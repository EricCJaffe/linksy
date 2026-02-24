'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAssignTicket } from '@/lib/hooks/useTickets'
import { useProviderContacts } from '@/lib/hooks/useProviderContacts'
import { UserCheck, Mail, Briefcase } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AssignInternallyDialogProps {
  ticketId: string
  ticketNumber: string
  providerId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AssignInternallyDialog({
  ticketId,
  ticketNumber,
  providerId,
  open,
  onOpenChange,
}: AssignInternallyDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [selectedContactUserId, setSelectedContactUserId] = useState<string>('')
  const [notes, setNotes] = useState('')

  const assignMutation = useAssignTicket()

  // Fetch contacts for this provider
  const { data: contactsData, isLoading } = useProviderContacts(providerId, {
    enabled: open && !!providerId,
  })

  const contacts = contactsData?.contacts || []

  const handleSubmit = async () => {
    if (!selectedContactUserId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a contact to assign this ticket to',
      })
      return
    }

    try {
      await assignMutation.mutateAsync({
        ticketId,
        assigned_to_user_id: selectedContactUserId,
        notes: notes.trim() || undefined,
      })

      toast({
        title: 'Ticket assigned',
        description: 'The ticket has been assigned to the selected contact.',
      })

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to assign ticket',
      })
    }
  }

  const handleClose = () => {
    setSelectedContactUserId('')
    setNotes('')
    onOpenChange(false)
  }

  const selectedContact = contacts.find((c) => c.user_id === selectedContactUserId)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-blue-600" />
            Assign Ticket Internally
          </DialogTitle>
          <DialogDescription>
            Assign ticket #{ticketNumber} to another contact at your organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="contact">Select contact</Label>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No other contacts found for this provider
              </div>
            ) : (
              <Select value={selectedContactUserId} onValueChange={setSelectedContactUserId}>
                <SelectTrigger id="contact">
                  <SelectValue placeholder="Choose a contact" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.user_id || ''} disabled={!contact.user_id}>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="font-medium">
                            {contact.user?.full_name || contact.user?.email || 'Unknown'}
                          </div>
                          {contact.job_title && (
                            <div className="text-xs text-muted-foreground">{contact.job_title}</div>
                          )}
                        </div>
                        {contact.is_default_referral_handler && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                            Default Handler
                          </span>
                        )}
                        {contact.provider_role === 'admin' && (
                          <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                            Admin
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedContact && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <UserCheck className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="font-medium text-sm">
                    {selectedContact.user?.full_name || 'Unknown Contact'}
                  </div>
                  {selectedContact.user?.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {selectedContact.user.email}
                    </div>
                  )}
                  {selectedContact.job_title && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Briefcase className="h-3 w-3" />
                      {selectedContact.job_title}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any context about this assignment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedContactUserId || assignMutation.isPending}
          >
            {assignMutation.isPending ? 'Assigning...' : 'Assign Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
