'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useCreateProviderContact, useUpdateProviderContact } from '@/lib/hooks/useProviderContacts'
import type { ProviderContact, ProviderContactRole } from '@/lib/types/linksy'
import { AlertCircle } from 'lucide-react'

interface ContactManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  providerId: string
  contact?: ProviderContact
  mode: 'create' | 'edit'
  isOwnContact?: boolean
}

export function ContactManagementDialog({
  open,
  onOpenChange,
  providerId,
  contact,
  mode,
  isOwnContact = false,
}: ContactManagementDialogProps) {
  const createContact = useCreateProviderContact()
  const updateContact = useUpdateProviderContact()

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    job_title: '',
    phone: '',
    contact_type: 'provider_employee' as string,
    provider_role: 'user' as ProviderContactRole,
    is_primary_contact: false,
    is_default_referral_handler: false,
  })

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (contact && mode === 'edit') {
      setFormData({
        email: contact.user?.email || '',
        full_name: contact.user?.full_name || '',
        job_title: contact.job_title || '',
        phone: contact.phone || '',
        contact_type: contact.contact_type || 'provider_employee',
        provider_role: contact.provider_role,
        is_primary_contact: contact.is_primary_contact,
        is_default_referral_handler: contact.is_default_referral_handler,
      })
    } else if (mode === 'create') {
      setFormData({
        email: '',
        full_name: '',
        job_title: '',
        phone: '',
        contact_type: 'provider_employee',
        provider_role: 'user',
        is_primary_contact: false,
        is_default_referral_handler: false,
      })
    }
    setError(null)
  }, [contact, mode, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      if (mode === 'create') {
        await createContact.mutateAsync({
          providerId,
          ...formData,
        })
      } else if (contact) {
        await updateContact.mutateAsync({
          providerId,
          contactId: contact.id,
          ...formData,
        })
      }
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add New Contact' : 'Edit Contact'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a new contact to this provider organization. An invitation will be sent if they don\'t have an account.'
              : 'Update contact information and permissions.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isOwnContact && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You can only edit your job title and phone number. Contact your organization admin to change other settings.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                disabled={mode === 'edit'}
              />
              {mode === 'edit' && (
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                disabled={mode === 'edit'}
              />
              {mode === 'edit' && (
                <p className="text-xs text-muted-foreground">Name is set by user profile</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="job_title">Job Title</Label>
              <Input
                id="job_title"
                value={formData.job_title}
                onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_type">Contact Type</Label>
              <Select
                value={formData.contact_type}
                onValueChange={(value) => setFormData({ ...formData, contact_type: value })}
                disabled={isOwnContact}
              >
                <SelectTrigger id="contact_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="provider_employee">Provider Employee</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider_role">Provider Role *</Label>
              <Select
                value={formData.provider_role}
                onValueChange={(value) => setFormData({ ...formData, provider_role: value as ProviderContactRole })}
                disabled={isOwnContact}
              >
                <SelectTrigger id="provider_role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Provider Admin (Full Access)</SelectItem>
                  <SelectItem value="user">Provider User (Referral Management)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Admin: Can edit company details and manage all. User: Can only manage referrals.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_primary_contact"
                checked={formData.is_primary_contact}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_primary_contact: checked === true })
                }
                disabled={isOwnContact}
              />
              <Label htmlFor="is_primary_contact" className="font-normal cursor-pointer">
                Primary Contact
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default_referral_handler"
                checked={formData.is_default_referral_handler}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_default_referral_handler: checked === true })
                }
                disabled={isOwnContact}
              />
              <Label htmlFor="is_default_referral_handler" className="font-normal cursor-pointer">
                Default Referral Handler (new referrals auto-assign to this contact)
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createContact.isPending || updateContact.isPending}
            >
              {createContact.isPending || updateContact.isPending
                ? 'Saving...'
                : mode === 'create'
                ? 'Add Contact'
                : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
