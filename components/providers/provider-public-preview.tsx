'use client'

import { useState } from 'react'
import {
  Eye,
  MapPin,
  Phone,
  Globe,
  Mail,
  Clock,
  ExternalLink,
  Send,
  AlertTriangle,
  CheckCircle2,
  Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { RichTextDisplay } from '@/components/ui/rich-text-display'
import { formatPhoneWithExt } from '@/lib/utils/phone'
import type { ProviderDetail } from '@/lib/types/linksy'

interface ProviderPublicPreviewProps {
  provider: ProviderDetail
}

export function ProviderPublicPreview({ provider }: ProviderPublicPreviewProps) {
  const [open, setOpen] = useState(false)

  const primaryLocation =
    provider.locations?.find((l) => l.is_primary) ?? provider.locations?.[0] ?? null
  const services = (provider.provider_needs || [])
    .filter((pn) => pn.need)
    .map((pn) => pn.need!)
  const canCreateReferral =
    provider.is_active && provider.accepting_referrals && !provider.is_frozen
  const fullAddress = primaryLocation
    ? [
        primaryLocation.address_line1,
        primaryLocation.address_line2,
        [primaryLocation.city, primaryLocation.state].filter(Boolean).join(', '),
        primaryLocation.postal_code,
      ]
        .filter(Boolean)
        .join(', ')
    : null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-1.5" />
          Public Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Public Preview</DialogTitle>
          <DialogDescription>
            How this provider appears to clients in the chatbot search results. All information shown below is visible to end users.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {/* Simulated chat bubble */}
          <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3 text-sm">
            <p className="text-muted-foreground text-xs mb-3 italic">
              Here are some resources that may help:
            </p>

            {/* Full provider card */}
            <Card className="bg-background border shadow-sm">
              <CardContent className="p-4 space-y-3">
                {/* Header: Name + distance */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base leading-tight">
                      {provider.name}
                    </h3>
                    {primaryLocation && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                        {[primaryLocation.city, primaryLocation.state]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                  </div>
                  <Badge className="text-xs shrink-0 inline-flex items-center gap-1 bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                    <MapPin className="h-3 w-3" />
                    2.1 mi away
                  </Badge>
                </div>

                {/* Full description */}
                {provider.description && (
                  <div className="border-t pt-3">
                    <RichTextDisplay
                      content={provider.description}
                      className="text-sm text-foreground leading-relaxed"
                    />
                  </div>
                )}

                {/* Services offered */}
                {services.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">
                      Services Offered
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {services.map((need) => (
                        <Badge
                          key={need.id}
                          variant="secondary"
                          className="text-xs"
                        >
                          {need.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact information */}
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">
                    Contact Information
                  </p>

                  {provider.phone && (
                    <a
                      href={`tel:${provider.phone}`}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4 shrink-0" />
                      {formatPhoneWithExt(provider.phone, provider.phone_extension)}
                    </a>
                  )}

                  {provider.email && (
                    <a
                      href={`mailto:${provider.email}`}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Mail className="h-4 w-4 shrink-0" />
                      {provider.email}
                    </a>
                  )}

                  {provider.website && (
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <Globe className="h-4 w-4 shrink-0" />
                      {provider.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                      <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
                    </a>
                  )}

                  {fullAddress && (
                    <p className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4 shrink-0 mt-0.5" />
                      {fullAddress}
                    </p>
                  )}

                  {provider.hours && (
                    <p className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 shrink-0 mt-0.5" />
                      {provider.hours}
                    </p>
                  )}
                </div>

                {/* Referral instructions (contact_directly) */}
                {provider.referral_type === 'contact_directly' &&
                  provider.referral_instructions && (
                    <div className="border-t pt-3">
                      <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-xs mb-0.5">
                            Contact this provider directly
                          </p>
                          <p className="text-xs">{provider.referral_instructions}</p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Create Referral button */}
                {canCreateReferral && provider.referral_type !== 'contact_directly' && (
                  <div className="border-t pt-3">
                    <Button size="sm" className="w-full" disabled>
                      <Send className="h-4 w-4 mr-2" />
                      Create Referral
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-1">
                      Clients can submit a referral request from this card
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status / diagnostic info for admins */}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Diagnostic Info
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <StatusRow
                label="Status"
                ok={provider.is_active}
                value={provider.is_active ? 'Active' : 'Inactive'}
              />
              <StatusRow
                label="Accepting Referrals"
                ok={provider.accepting_referrals}
                value={provider.accepting_referrals ? 'Yes' : 'No'}
              />
              <StatusRow
                label="Frozen"
                ok={!provider.is_frozen}
                value={provider.is_frozen ? `Yes — ${provider.frozen_reason || 'No reason'}` : 'No'}
              />
              <StatusRow
                label="Description"
                ok={!!provider.description}
                value={provider.description ? 'Set' : 'Missing'}
              />
              <StatusRow
                label="Location"
                ok={!!primaryLocation}
                value={primaryLocation ? 'Set' : 'Missing'}
              />
              <StatusRow
                label="Services"
                ok={services.length > 0}
                value={`${services.length} configured`}
              />
              <StatusRow
                label="Referral Type"
                ok
                value={provider.referral_type === 'contact_directly' ? 'Contact Directly' : 'Standard'}
              />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function StatusRow({
  label,
  ok,
  value,
}: {
  label: string
  ok: boolean
  value: string
}) {
  return (
    <div className="flex items-center gap-1.5 rounded bg-muted/50 px-2 py-1.5">
      {ok ? (
        <CheckCircle2 className="h-3 w-3 text-green-600 shrink-0" />
      ) : (
        <AlertTriangle className="h-3 w-3 text-amber-500 shrink-0" />
      )}
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  )
}
