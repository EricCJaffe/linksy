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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useForwardTicket } from '@/lib/hooks/useTickets'
import { useProviders } from '@/lib/hooks/useProviders'
import { Input } from '@/components/ui/input'
import { ArrowRight, AlertTriangle, Building2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ForwardTicketDialogProps {
  ticketId: string
  ticketNumber: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ForwardTicketDialog({
  ticketId,
  ticketNumber,
  open,
  onOpenChange,
}: ForwardTicketDialogProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState<1 | 2>(1)
  const [action, setAction] = useState<'forward_to_admin' | 'forward_to_provider'>('forward_to_admin')
  const [targetProviderId, setTargetProviderId] = useState<string>('')
  const [reason, setReason] = useState<'unable_to_assist' | 'wrong_org' | 'capacity' | 'other'>('unable_to_assist')
  const [notes, setNotes] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const forwardMutation = useForwardTicket()

  // Fetch providers for autocomplete (only if forwarding to provider)
  const { data: providersData } = useProviders(
    { q: searchQuery, limit: 20, status: 'active' },
    { enabled: action === 'forward_to_provider' && searchQuery.length > 0 }
  )

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    }
  }

  const handleBack = () => {
    setStep(1)
  }

  const handleSubmit = async () => {
    try {
      await forwardMutation.mutateAsync({
        ticketId,
        action,
        target_provider_id: action === 'forward_to_provider' ? targetProviderId : undefined,
        reason,
        notes: notes.trim() || undefined,
      })

      toast({
        title: 'Ticket forwarded',
        description:
          action === 'forward_to_admin'
            ? 'The ticket has been forwarded to the admin pool for reassignment.'
            : 'The ticket has been forwarded to the selected provider.',
      })

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to forward ticket',
      })
    }
  }

  const handleClose = () => {
    setStep(1)
    setAction('forward_to_admin')
    setTargetProviderId('')
    setReason('unable_to_assist')
    setNotes('')
    setSearchQuery('')
    onOpenChange(false)
  }

  const selectedProvider = providersData?.providers.find((p) => p.id === targetProviderId)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-orange-600" />
            Forward Ticket #{ticketNumber}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Choose where to forward this ticket'
              : 'Provide details about why you are forwarding this ticket'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Step 1: Choose action */}
          {step === 1 && (
            <div className="space-y-4">
              <Label>Forward to</Label>
              <RadioGroup value={action} onValueChange={(v) => setAction(v as any)}>
                <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-muted/50">
                  <RadioGroupItem value="forward_to_admin" id="admin" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="admin" className="font-semibold cursor-pointer">
                      Admin Pool
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Return this ticket to the admin pool for manual reassignment. Admins will be
                      notified.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 rounded-lg border p-4 hover:bg-muted/50">
                  <RadioGroupItem value="forward_to_provider" id="provider" className="mt-0.5" />
                  <div className="flex-1">
                    <Label htmlFor="provider" className="font-semibold cursor-pointer">
                      Another Provider
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Forward directly to another provider that can better assist this client.
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {action === 'forward_to_provider' && (
                <div className="space-y-2 mt-4">
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
                  {selectedProvider && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start gap-2">
                        <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{selectedProvider.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {selectedProvider.description?.substring(0, 120)}
                            {selectedProvider.description && selectedProvider.description.length > 120
                              ? '...'
                              : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Reason and notes */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="text-sm">
                  <strong>Forwarding to:</strong>{' '}
                  {action === 'forward_to_admin' ? 'Admin Pool' : selectedProvider?.name || 'Unknown'}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for forwarding</Label>
                <Select value={reason} onValueChange={(v) => setReason(v as any)}>
                  <SelectTrigger id="reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unable_to_assist">Unable to assist</SelectItem>
                    <SelectItem value="wrong_org">Wrong organization</SelectItem>
                    <SelectItem value="capacity">At capacity</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Provide context about why this ticket should be forwarded..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 1 && (
            <Button
              onClick={handleNext}
              disabled={action === 'forward_to_provider' && !targetProviderId}
            >
              Next
            </Button>
          )}
          {step === 2 && (
            <>
              <Button variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={forwardMutation.isPending}>
                {forwardMutation.isPending ? 'Forwarding...' : 'Forward Ticket'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
