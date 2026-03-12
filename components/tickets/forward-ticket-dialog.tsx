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
import { Checkbox } from '@/components/ui/checkbox'
import { useForwardTicket } from '@/lib/hooks/useTickets'
import { useProviders } from '@/lib/hooks/useProviders'
import { Input } from '@/components/ui/input'
import { ArrowRight, AlertTriangle, Building2, ShieldAlert } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ForwardTicketDialogProps {
  ticketId: string
  ticketNumber: string
  reassignmentCount?: number
  isSiteAdmin?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

const MAX_TRANSFERS = 2

export function ForwardTicketDialog({
  ticketId,
  ticketNumber,
  reassignmentCount = 0,
  isSiteAdmin = false,
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
  const [adminOverride, setAdminOverride] = useState(false)

  const forwardMutation = useForwardTicket()

  const atTransferLimit = reassignmentCount >= MAX_TRANSFERS
  const canTransferToProvider = !atTransferLimit || (isSiteAdmin && adminOverride)

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
        title: action === 'forward_to_admin' ? 'Referral forwarded to admin' : 'Referral transferred',
        description:
          action === 'forward_to_admin'
            ? 'The referral has been returned to the admin pool for reassignment.'
            : `The referral has been transferred to ${selectedProvider?.name || 'the selected provider'}. Status set to "Transferred Pending".`,
      })

      onOpenChange(false)
      router.refresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to forward referral'
      toast({
        variant: 'destructive',
        title: 'Error',
        description: message,
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
    setAdminOverride(false)
    onOpenChange(false)
  }

  const selectedProvider = providersData?.providers.find((p) => p.id === targetProviderId)

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5 text-orange-600" />
            Forward Referral #{ticketNumber}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Choose where to forward this referral'
              : 'Provide details about why you are forwarding this referral'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Transfer count indicator */}
          {reassignmentCount > 0 && (
            <div className={`flex items-start gap-2 p-3 rounded-md border text-sm ${
              atTransferLimit
                ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
                : 'bg-muted/50 border-border'
            }`}>
              {atTransferLimit ? (
                <ShieldAlert className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              )}
              <div>
                <span className="font-medium">
                  {reassignmentCount} of {MAX_TRANSFERS} transfers used.
                </span>
                {atTransferLimit && (
                  <span className="text-red-700 dark:text-red-400 ml-1">
                    Transfer limit reached. {isSiteAdmin ? 'Admin override available.' : 'Contact an admin for further transfers.'}
                  </span>
                )}
              </div>
            </div>
          )}

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
                      Return this referral to the admin pool for manual reassignment. Status will be
                      set to &quot;Transferred&quot;.
                    </p>
                  </div>
                </div>

                <div className={`flex items-start space-x-3 rounded-lg border p-4 ${
                  atTransferLimit && !isSiteAdmin ? 'opacity-50' : 'hover:bg-muted/50'
                }`}>
                  <RadioGroupItem
                    value="forward_to_provider"
                    id="provider"
                    className="mt-0.5"
                    disabled={atTransferLimit && !isSiteAdmin}
                  />
                  <div className="flex-1">
                    <Label htmlFor="provider" className="font-semibold cursor-pointer">
                      Another Provider
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Transfer directly to another provider. The new provider will see this as
                      &quot;Transferred Pending&quot;.
                    </p>
                  </div>
                </div>
              </RadioGroup>

              {/* Admin override for transfer limit */}
              {action === 'forward_to_provider' && atTransferLimit && isSiteAdmin && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-md border border-amber-200 dark:border-amber-800">
                  <Checkbox
                    id="admin-override"
                    checked={adminOverride}
                    onCheckedChange={(checked) => setAdminOverride(checked === true)}
                    className="mt-0.5"
                  />
                  <Label htmlFor="admin-override" className="text-sm cursor-pointer">
                    <span className="font-semibold">Admin override:</span> Allow this transfer beyond the {MAX_TRANSFERS}-transfer limit.
                    This will be logged in the audit trail.
                  </Label>
                </div>
              )}

              {action === 'forward_to_provider' && canTransferToProvider && (
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
                  <br />
                  <span className="text-muted-foreground">
                    {action === 'forward_to_admin'
                      ? 'Status will be set to "Transferred Another Provider"'
                      : 'New provider will see status "Transferred Pending"'}
                  </span>
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
                <Label htmlFor="notes">Transfer notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Provide context for the transfer — this will be visible to both providers..."
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
              disabled={
                (action === 'forward_to_provider' && !targetProviderId) ||
                (action === 'forward_to_provider' && !canTransferToProvider)
              }
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
                {forwardMutation.isPending
                  ? 'Forwarding...'
                  : action === 'forward_to_provider'
                    ? 'Transfer Referral'
                    : 'Forward Referral'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
