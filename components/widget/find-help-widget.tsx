'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, MapPin, Phone, Globe, Send, AlertTriangle, X, Navigation } from 'lucide-react'
import type { HostWidgetConfig } from '@/lib/types/linksy'
import { RichTextDisplay } from '@/components/ui/rich-text-display'

interface SearchResult {
  id: string
  name: string
  description: string | null
  phone: string | null
  email: string | null
  website: string | null
  hours_of_operation: string | null
  referral_type: string
  referral_instructions: string | null
  distance: number | null
  primaryLocation: {
    address_line1: string | null
    city: string | null
    state: string | null
    postal_code: string | null
  } | null
  provider_needs: Array<{ need: { id: string; name: string } }>
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  providers?: SearchResult[]
  isCrisis?: boolean
}

interface CrisisResult {
  crisis_type: string
  severity: string
  response_template: string | null
  emergency_resources: Array<{ name: string; phone: string; url: string; description: string }>
  matched_keyword: string
}

interface FindHelpWidgetProps {
  hostProviderId?: string
  hostProviderName?: string
  widgetConfig?: HostWidgetConfig
}

const SITE_ID = '86bd8d01-0dc5-4479-beff-666712654104'

const CRISIS_TYPE_LABELS: Record<string, string> = {
  suicide: 'Suicide & Crisis',
  domestic_violence: 'Domestic Violence',
  trafficking: 'Human Trafficking',
  child_abuse: 'Child Abuse',
}

export function FindHelpWidget({ hostProviderId, hostProviderName, widgetConfig }: FindHelpWidgetProps) {
  const botName = widgetConfig?.bot_name ?? 'Linksy'
  const welcomeMessage =
    (widgetConfig?.welcome_message ??
    `Hello! I'm ${botName}, your community resource assistant. What do you need help with today?`) +
    '\n\n⚠️ If this is a medical or safety emergency, please dial 911.'

  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: welcomeMessage },
  ])
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [crisisBanner, setCrisisBanner] = useState<CrisisResult | null>(null)
  const [bannerDismissable, setBannerDismissable] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLabel, setLocationLabel] = useState<string | null>(null)
  const [zipInput, setZipInput] = useState('')
  const [showZipInput, setShowZipInput] = useState(false)
  const [isGeolocating, setIsGeolocating] = useState(false)

  function requestGeolocation() {
    if (!navigator.geolocation) {
      setShowZipInput(true)
      return
    }
    setIsGeolocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        setUserLocation({ lat: latitude, lng: longitude })
        setLocationLabel('Your location')
        setShowZipInput(false)
        setIsGeolocating(false)
      },
      () => {
        // Permission denied or error — fall back to ZIP
        setShowZipInput(true)
        setIsGeolocating(false)
      },
      { timeout: 8000 }
    )
  }

  function applyZip() {
    const zip = zipInput.trim()
    if (!zip) return
    setUserLocation(null)           // ZIP will be resolved server-side
    setLocationLabel(`ZIP ${zip}`)
    setShowZipInput(false)
  }

  function clearLocation() {
    setUserLocation(null)
    setLocationLabel(null)
    setZipInput('')
    setShowZipInput(false)
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function checkCrisis(message: string): Promise<CrisisResult | null> {
    try {
      const res = await fetch('/api/crisis-keywords/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, site_id: SITE_ID }),
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.detected ? data.result : null
    } catch {
      return null
    }
  }

  async function handleSearch() {
    if (!query.trim() || isSearching) return

    const userMessage: Message = { role: 'user', content: query }
    setMessages((prev) => [...prev, userMessage])
    const currentQuery = query
    setQuery('')
    setIsSearching(true)

    try {
      // 1. Crisis check (runs before search, in parallel with search for speed)
      const [crisisResult, searchResponse] = await Promise.all([
        checkCrisis(currentQuery),
        fetch('/api/linksy/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: currentQuery,
            hostProviderId: hostProviderId ?? null,
            location: userLocation ?? undefined,
            zipCode: !userLocation && locationLabel ? zipInput.trim() || undefined : undefined,
            sessionId: sessionId ?? undefined,
          }),
        }),
      ])

      // 2. Show crisis banner if detected (non-dismissable for 5 seconds)
      if (crisisResult) {
        setCrisisBanner(crisisResult)
        setBannerDismissable(false)
        setTimeout(() => setBannerDismissable(true), 5000)
      }

      // 3. Process search results
      if (!searchResponse.ok) throw new Error('Search failed')
      const data = await searchResponse.json()

      // Store sessionId from first response
      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId)
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        providers: data.providers,
        isCrisis: !!crisisResult,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: "I'm sorry, I encountered an error while searching. Please try again." },
      ])
    } finally {
      setIsSearching(false)
    }
  }

  function trackInteraction(providerId: string, interactionType: string) {
    fetch('/api/linksy/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider_id: providerId,
        interaction_type: interactionType,
        session_id: sessionId ?? undefined,
      }),
    }).catch(() => {})
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  const primaryColor = widgetConfig?.primary_color ?? '#2563eb'
  const secondaryColor = widgetConfig?.secondary_color
  const headerBgColor = widgetConfig?.header_bg_color
  const fontFamily = widgetConfig?.font_family

  return (
    <div className="flex flex-col h-screen bg-background" style={fontFamily ? { fontFamily } : undefined}>
      {/* Header */}
      <div
        className="border-b px-4 py-3 flex items-center gap-3"
        style={{ borderColor: primaryColor + '33', ...(headerBgColor ? { backgroundColor: headerBgColor } : {}) }}
      >
        {widgetConfig?.logo_url && (
          <img src={widgetConfig.logo_url} alt="" className="h-8 w-auto object-contain" />
        )}
        <div>
          <h1 className="font-semibold text-sm">{botName}</h1>
          {hostProviderName && (
            <p className="text-xs text-muted-foreground">Powered by {hostProviderName}</p>
          )}
        </div>
      </div>

      {/* Crisis Banner */}
      {crisisBanner && (
        <div className="bg-red-600 text-white px-4 py-3 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {CRISIS_TYPE_LABELS[crisisBanner.crisis_type] ?? 'Crisis'} Resources Available
            </p>
            {crisisBanner.response_template && (
              <p className="text-xs mt-0.5 opacity-90">{crisisBanner.response_template}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              {crisisBanner.emergency_resources.map((r, i) => (
                <a
                  key={i}
                  href={`tel:${r.phone.replace(/\D/g, '')}`}
                  className="inline-flex items-center gap-1 bg-white text-red-700 rounded px-2 py-1 text-xs font-semibold hover:bg-red-50"
                >
                  <Phone className="h-3 w-3" />
                  {r.name}: {r.phone}
                </a>
              ))}
            </div>
          </div>
          {bannerDismissable && (
            <button
              onClick={() => setCrisisBanner(null)}
              className="text-white/70 hover:text-white text-lg leading-none ml-2"
              aria-label="Dismiss"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Location bar */}
      <div className="border-b px-4 py-2 bg-muted/30">
        {locationLabel ? (
          <div className="flex items-center gap-2 text-xs">
            <MapPin className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
            <span className="text-green-700 font-medium">{locationLabel}</span>
            <span className="text-muted-foreground">— results will be sorted by distance</span>
            <button onClick={clearLocation} className="ml-auto text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : showZipInput ? (
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
            <Input
              value={zipInput}
              onChange={(e) => setZipInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyZip()}
              placeholder="Enter ZIP code"
              className="h-7 text-xs w-32"
              maxLength={10}
              autoFocus
            />
            <Button size="sm" className="h-7 text-xs px-2" onClick={applyZip} disabled={!zipInput.trim()}>
              Set
            </Button>
            <button onClick={() => setShowZipInput(false)} className="text-muted-foreground hover:text-foreground ml-auto">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={requestGeolocation}
              disabled={isGeolocating}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {isGeolocating
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Navigation className="h-3.5 w-3.5" />
              }
              {isGeolocating ? 'Locating…' : 'Use my location'}
            </button>
            <span className="text-muted-foreground text-xs">or</span>
            <button
              onClick={() => setShowZipInput(true)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Enter ZIP code
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === 'user'
                  ? 'text-white rounded-br-sm'
                  : 'bg-muted rounded-bl-sm'
              }`}
              style={msg.role === 'user' ? { backgroundColor: primaryColor } : undefined}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>

              {/* Provider Cards */}
              {msg.providers && msg.providers.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.providers.map((provider) => (
                    <Card key={provider.id} className="bg-background border">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{provider.name}</p>
                            {provider.primaryLocation && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3 w-3 flex-shrink-0" />
                                {[provider.primaryLocation.city, provider.primaryLocation.state]
                                  .filter(Boolean)
                                  .join(', ')}
                              </p>
                            )}
                            {provider.distance !== null && (
                              <Badge
                                className={`mt-1 text-xs inline-flex items-center gap-1 ${
                                  secondaryColor ? '' : 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100'
                                }`}
                                style={secondaryColor
                                  ? { backgroundColor: secondaryColor + '20', color: secondaryColor, borderColor: secondaryColor + '40' }
                                  : undefined}
                              >
                                <MapPin className="h-3 w-3" />
                                {provider.distance} mi away
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            {provider.phone && (
                              <a
                                href={`tel:${provider.phone.replace(/\D/g, '')}`}
                                onClick={() => trackInteraction(provider.id, 'phone_click')}
                                className={`inline-flex items-center gap-1 text-xs hover:underline ${secondaryColor ? '' : 'text-primary'}`}
                                style={secondaryColor ? { color: secondaryColor } : undefined}
                              >
                                <Phone className="h-3 w-3" />
                                {provider.phone}
                              </a>
                            )}
                            {provider.website && (
                              <a
                                href={provider.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => trackInteraction(provider.id, 'website_click')}
                                className={`inline-flex items-center gap-1 text-xs hover:underline ${secondaryColor ? '' : 'text-primary'}`}
                                style={secondaryColor ? { color: secondaryColor } : undefined}
                              >
                                <Globe className="h-3 w-3" />
                                Website
                              </a>
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
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isSearching && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t px-4 py-3 flex gap-2 items-end">
        <Textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what you need help with..."
          rows={2}
          className="flex-1 resize-none text-sm"
          disabled={isSearching}
        />
        <Button
          onClick={handleSearch}
          disabled={!query.trim() || isSearching}
          size="icon"
          className="h-10 w-10 flex-shrink-0"
          style={{ backgroundColor: primaryColor }}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <div className="px-4 pb-2 text-center space-y-0.5">
        <p className="text-xs text-muted-foreground">
          If this is a medical or safety emergency, please dial <strong>911</strong>.
        </p>
        <p className="text-xs text-muted-foreground">
          Powered by{' '}
          <a href="https://linksy.app" target="_blank" rel="noopener noreferrer" className="hover:underline">
            Linksy
          </a>
        </p>
      </div>
    </div>
  )
}
