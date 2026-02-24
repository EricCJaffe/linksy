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
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useReassignTicket } from '@/lib/hooks/useTickets'
import { useProviders } from '@/lib/hooks/useProviders'
import { useProviderContacts } from '@/lib/hooks/useProviderContacts'
import { Building2, UserCheck, Shield } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ReassignTicketDialogProps {
  ticketId: string
  ticketNumber: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReassignTicketDialog({
  ticketId,
  ticketNumber,
  open,
  onOpenChange,
}: ReassignTicketDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [targetProviderId, setTargetProviderId] = useState<string>('')
  const [targetContactId, setTargetContactId] = useState<string>('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [preserveHistory, setPreserveHistory] = useState(false)

  const reassignMutation = useReassignTicket()

  // Fetch providers for search
  const { data: providersData } = useProviders(
    { q: searchQuery, limit: 20, status: 'active' },
    { enabled: searchQuery.length > 0 }
  )

  // Fetch contacts for selected provider
  const { data: contactsData } = useProviderContacts(targetProviderId, {
    enabled: !!targetProviderId,
  })

  const contacts = contactsData || []
  const selectedProvider = providersData?.providers.find((p) => p.id === targetProviderId)

  const handleSubmit = async () => {
    if (!targetProviderId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select a provider to reassign this ticket to',
      })
      return
    }

    try {
      await reassignMutation.mutateAsync({
        ticketId,
        target_provider_id: targetProviderId,
        target_contact_id: targetContactId || undefined,
        reason: reason.trim() || undefined,
        notes: notes.trim() || undefined,
        preserve_history: preserveHistory,
      })

      toast({
        title: 'Ticket reassigned',
        description: `The ticket has been reassigned to ${selectedProvider?.name || 'the selected provider'}.`,
      })

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reassign ticket',
      })
    }
  }

  const handleClose = () => {
    setSearchQuery('')
    setTargetProviderId('')
    setTargetContactId('')
    setReason('')
    setNotes('')
    setPreserveHistory(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            Admin: Reassign Ticket #{ticketNumber}
          </DialogTitle>
          <DialogDescription>
            Reassign this ticket to a different provider organization
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Provider search */}
          <div className="space-y-2">
            <Label htmlFor="provider-search">Search for provider</Label>
            <Input
              id="provider-search"
              placeholder="Start typing provider name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && providersData && providersData.providers.length > 0 && (
              <div className="border rounded-md max-h-48 overflow-y-auto">
                {providersData.providers.map((provider) => (
                  <button
                    key={provider.id}
                    type="button"
                    onClick={() => {
                      setTargetProviderId(provider.id)
                      setSearchQuery(provider.name)
                      setTargetContactId('') // Reset contact selection
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center gap-2 ${
                      targetProviderId === provider.id ? 'bg-muted' : ''
                    }`}
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{provider.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {provider.sector} • {provider.is_active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected provider */}
          {selectedProvider && (
            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-md border border-purple-200 dark:border-purple-800">
              <div className="flex items-start gap-2">
                <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{selectedProvider.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {selectedProvider.description?.substring(0, 120)}
                    {selectedProvider.description && selectedProvider.description.length > 120 ? '...' : ''}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Contact selection (optional) */}
          {targetProviderId && contacts.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="contact">Assign to specific contact (optional)</Label>
              <Select value={targetContactId} onValueChange={setTargetContactId}>
                <SelectTrigger id="contact">
                  <SelectValue placeholder="Auto-assign to default handler" />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-3 w-3" />
                        <div className="flex-1">
                          <div className="font-medium">
                            {contact.user?.full_name || contact.user?.email || 'Unknown'}
                          </div>
                          {contact.job_title && (
                            <div className="text-xs text-muted-foreground">{contact.job_title}</div>
                          )}
                        </div>
                        {contact.is_default_referral_handler && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded">
                            Default
                          </span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              placeholder="e.g., Better service match, geographic coverage..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Provide context about this reassignment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preserve history */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="preserve-history"
              checked={preserveHistory}
              onCheckedChange={(checked) => setPreserveHistory(checked === true)}
            />
            <Label htmlFor="preserve-history" className="text-sm font-normal cursor-pointer">
              Preserve forwarding history (keep track of original provider if this was forwarded)
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!targetProviderId || reassignMutation.isPending}
          >
            {reassignMutation.isPending ? 'Reassigning...' : 'Reassign Ticket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
