'use client'

import { useState } from 'react'
import { Eye, MapPin, Phone, Globe } from 'lucide-react'
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

  const primaryLocation = provider.locations?.find((l) => l.is_primary) ?? provider.locations?.[0] ?? null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4 mr-1.5" />
          Public Preview
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Public Preview</DialogTitle>
          <DialogDescription>
            How this provider appears to clients in the chatbot search results.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {/* Simulated chat bubble */}
          <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm">
            <p className="text-muted-foreground text-xs mb-2 italic">
              Here are some resources that may help:
            </p>

            {/* Provider card — mirrors find-help-widget.tsx rendering */}
            <Card className="bg-background border">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{provider.name}</p>
                    {primaryLocation && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        {[primaryLocation.city, primaryLocation.state]
                          .filter(Boolean)
                          .join(', ')}
                      </p>
                    )}
                    <Badge className="mt-1 text-xs inline-flex items-center gap-1 bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                      <MapPin className="h-3 w-3" />
                      2.1 mi away
                    </Badge>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {provider.phone && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        <Phone className="h-3 w-3" />
                        {formatPhoneWithExt(provider.phone, provider.phone_extension)}
                      </span>
                    )}
                    {provider.website && (
                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                        <Globe className="h-3 w-3" />
                        Website
                      </span>
                    )}
                  </div>
                </div>
                {provider.description && (
                  <div className="mt-2 line-clamp-2">
                    <RichTextDisplay content={provider.description} className="text-xs text-muted-foreground" />
                  </div>
                )}
                {provider.referral_type === 'contact_directly' && provider.referral_instructions && (
                  <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                    {provider.referral_instructions}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status warnings */}
          {!provider.is_active && (
            <p className="mt-3 text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">
              This provider is currently inactive and will not appear in search results.
            </p>
          )}
          {!provider.description && (
            <p className="mt-2 text-xs text-muted-foreground">
              No description set — clients will see an empty description area.
            </p>
          )}
          {!primaryLocation && (
            <p className="mt-2 text-xs text-muted-foreground">
              No location set — distance badge and city/state will not appear.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
