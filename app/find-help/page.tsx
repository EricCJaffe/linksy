'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  MapPin,
  Phone,
  Globe,
  Mail,
  Navigation,
  Send,
  ChevronRight,
  X,
  AlertTriangle,
  Heart,
  Utensils,
  Home,
  Briefcase,
  GraduationCap,
  HeartPulse,
  Shield,
  Baby,
  Users,
  Sparkles,
} from 'lucide-react'
import { CreateTicketDialog } from '@/components/tickets/create-ticket-dialog'
import { RichTextDisplay } from '@/components/ui/rich-text-display'
import type { LucideIcon } from 'lucide-react'

interface SearchResult {
  id: string
  name: string
  description: string | null
  phone: string | null
  email: string | null
  website: string | null
  hours_of_operation: string | null
  sector: string
  referral_type: string
  referral_instructions: string | null
  distance: number | null
  primaryLocation: {
    name: string | null
    address_line1: string | null
    address_line2: string | null
    city: string | null
    state: string | null
    postal_code: string | null
    latitude: number | null
    longitude: number | null
  } | null
  provider_needs: Array<{
    need: {
      id: string
      name: string
    }
  }>
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  providers?: SearchResult[]
}

interface NeedCategory {
  id: string
  name: string
  description: string | null
  needs: Array<{
    id: string
    name: string
  }>
  providerCount?: number
}

export default function FindHelpPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m here to help you find community services and resources. What do you need help with today?\n\n⚠️ If this is a medical or safety emergency, please dial 911.',
    },
  ])
  const [query, setQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Crisis state
  const [crisisBanner, setCrisisBanner] = useState<{
    crisis_type: string
    severity: string
    response_template: string | null
    emergency_resources: Array<{ name: string; phone: string; url: string; description: string }>
    matched_keyword: string
  } | null>(null)
  const [bannerDismissable, setBannerDismissable] = useState(false)

  const SITE_ID = '86bd8d01-0dc5-4479-beff-666712654104'

  async function checkCrisis(message: string) {
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

  const CRISIS_TYPE_LABELS: Record<string, string> = {
    suicide: 'Suicide & Crisis',
    domestic_violence: 'Domestic Violence',
    trafficking: 'Human Trafficking',
    child_abuse: 'Child Abuse',
  }

  // Location state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [locationLabel, setLocationLabel] = useState<string | null>(null)
  const [zipInput, setZipInput] = useState('')
  const [showZipInput, setShowZipInput] = useState(false)
  const [isGeolocating, setIsGeolocating] = useState(false)

  function requestGeolocation() {
    if (!navigator.geolocation) { setShowZipInput(true); return }
    setIsGeolocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocationLabel('Your location')
        setShowZipInput(false)
        setIsGeolocating(false)
      },
      () => { setShowZipInput(true); setIsGeolocating(false) },
      { timeout: 8000 }
    )
  }

  function applyZip() {
    const zip = zipInput.trim()
    if (!zip) return
    setUserLocation(null)
    setLocationLabel(`ZIP ${zip}`)
    setShowZipInput(false)
  }

  function clearLocation() {
    setUserLocation(null)
    setLocationLabel(null)
    setZipInput('')
    setShowZipInput(false)
  }

  // Category browsing state
  const [categories, setCategories] = useState<NeedCategory[]>([])
  const [categoryProviders, setCategoryProviders] = useState<{ [categoryId: string]: SearchResult[] }>({})
  const [loadingCategories, setLoadingCategories] = useState<{ [categoryId: string]: boolean }>({})
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  const selectedCategory = selectedCategoryId
    ? categories.find((c) => c.id === selectedCategoryId) || null
    : null

  const getCategoryVisual = (name: string): { icon: LucideIcon; chipClass: string; cardClass: string } => {
    const normalized = name.toLowerCase()

    if (normalized.includes('food') || normalized.includes('meal') || normalized.includes('nutrition')) {
      return {
        icon: Utensils,
        chipClass: 'bg-orange-100 text-orange-700',
        cardClass: 'border-orange-200 hover:border-orange-300 hover:bg-orange-50/60',
      }
    }

    if (normalized.includes('housing') || normalized.includes('shelter') || normalized.includes('rent')) {
      return {
        icon: Home,
        chipClass: 'bg-indigo-100 text-indigo-700',
        cardClass: 'border-indigo-200 hover:border-indigo-300 hover:bg-indigo-50/60',
      }
    }

    if (normalized.includes('job') || normalized.includes('employment') || normalized.includes('career')) {
      return {
        icon: Briefcase,
        chipClass: 'bg-amber-100 text-amber-700',
        cardClass: 'border-amber-200 hover:border-amber-300 hover:bg-amber-50/60',
      }
    }

    if (normalized.includes('education') || normalized.includes('school') || normalized.includes('training')) {
      return {
        icon: GraduationCap,
        chipClass: 'bg-violet-100 text-violet-700',
        cardClass: 'border-violet-200 hover:border-violet-300 hover:bg-violet-50/60',
      }
    }

    if (normalized.includes('health') || normalized.includes('medical') || normalized.includes('mental')) {
      return {
        icon: HeartPulse,
        chipClass: 'bg-rose-100 text-rose-700',
        cardClass: 'border-rose-200 hover:border-rose-300 hover:bg-rose-50/60',
      }
    }

    if (normalized.includes('safety') || normalized.includes('legal') || normalized.includes('crisis')) {
      return {
        icon: Shield,
        chipClass: 'bg-red-100 text-red-700',
        cardClass: 'border-red-200 hover:border-red-300 hover:bg-red-50/60',
      }
    }

    if (normalized.includes('child') || normalized.includes('family') || normalized.includes('parent')) {
      return {
        icon: Baby,
        chipClass: 'bg-sky-100 text-sky-700',
        cardClass: 'border-sky-200 hover:border-sky-300 hover:bg-sky-50/60',
      }
    }

    if (normalized.includes('community') || normalized.includes('social') || normalized.includes('support')) {
      return {
        icon: Users,
        chipClass: 'bg-emerald-100 text-emerald-700',
        cardClass: 'border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50/60',
      }
    }

    return {
      icon: Heart,
      chipClass: 'bg-blue-100 text-blue-700',
      cardClass: 'border-blue-200 hover:border-blue-300 hover:bg-blue-50/60',
    }
  }

  const handleSearch = async () => {
    if (!query.trim()) return

    const currentQuery = query
    const userMessage: Message = { role: 'user', content: currentQuery }
    setMessages((prev) => [...prev, userMessage])
    setQuery('')
    setIsSearching(true)

    try {
      const [crisisResult, response] = await Promise.all([
        checkCrisis(currentQuery),
        fetch('/api/linksy/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: currentQuery,
            location: userLocation ?? undefined,
            zipCode: !userLocation && locationLabel ? zipInput.trim() || undefined : undefined,
            sessionId: sessionId ?? undefined,
          }),
        }),
      ])

      // Show crisis banner if detected (non-dismissable for 5 seconds)
      if (crisisResult) {
        setCrisisBanner(crisisResult)
        setBannerDismissable(false)
        setTimeout(() => setBannerDismissable(true), 5000)
      }

      if (!response.ok) {
        throw new Error('Search failed')
      }

      const data = await response.json()

      if (data.sessionId && !sessionId) {
        setSessionId(data.sessionId)
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        providers: data.providers,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Search error:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I\'m sorry, I encountered an error while searching. Please try again.',
        },
      ])
    } finally {
      setIsSearching(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSearch()
    }
  }

  // Fetch need categories and count providers for each on mount
  useEffect(() => {
    const fetchCategoriesWithProviders = async () => {
      try {
        // Fetch categories
        const categoriesResponse = await fetch('/api/need-categories')
        if (!categoriesResponse.ok) return
        const categoriesData = await categoriesResponse.json()

        // Fetch all providers
        const providersResponse = await fetch('/api/linksy/providers?limit=200')
        if (!providersResponse.ok) return
        const providersData = await providersResponse.json()

        // Count providers for each category
        const categoriesWithCounts = categoriesData.map((category: NeedCategory) => {
          const needIds = category.needs.map((n) => n.id)
          const providerCount = providersData.providers.filter((provider: any) =>
            provider.provider_needs?.some((pn: any) => needIds.includes(pn.need?.id))
          ).length

          return {
            ...category,
            providerCount,
          }
        })

        // Only show categories with providers
        const categoriesWithProviders = categoriesWithCounts.filter(
          (cat: any) => cat.providerCount > 0
        )

        setCategories(categoriesWithProviders)
      } catch (error) {
        console.error('Error fetching categories:', error)
      }
    }

    fetchCategoriesWithProviders()
  }, [])

  // Load providers for a category when a category card is selected
  const handleCategoryOpen = async (categoryId: string) => {
    setSelectedCategoryId(categoryId)

    // If already loaded, don't fetch again
    if (categoryProviders[categoryId]) return

    setLoadingCategories((prev) => ({ ...prev, [categoryId]: true }))

    try {
      // Get all needs for this category
      const category = categories.find((c) => c.id === categoryId)
      if (!category) return

      const needIds = category.needs.map((n) => n.id)

      // Fetch providers that offer these needs
      const response = await fetch('/api/linksy/providers?limit=200')
      if (!response.ok) throw new Error('Failed to fetch providers')

      const data = await response.json()

      // Filter providers that have at least one need from this category
      const matchingProviders = data.providers.filter((provider: any) =>
        provider.provider_needs?.some((pn: any) => needIds.includes(pn.need?.id))
      )

      // Transform to match SearchResult format
      const transformedProviders: SearchResult[] = matchingProviders.map((provider: any) => ({
        id: provider.id,
        name: provider.name,
        description: provider.description,
        phone: provider.phone,
        email: provider.email,
        website: provider.website,
        hours_of_operation: provider.hours_of_operation,
        sector: provider.sector,
        referral_type: provider.referral_type,
        referral_instructions: provider.referral_instructions,
        distance: null,
        primaryLocation: provider.locations?.[0] || null,
        provider_needs: provider.provider_needs || [],
      }))

      setCategoryProviders((prev) => ({ ...prev, [categoryId]: transformedProviders }))
    } catch (error) {
      console.error('Error loading providers:', error)
    } finally {
      setLoadingCategories((prev) => ({ ...prev, [categoryId]: false }))
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Find Community Resources
          </h1>
          <p className="text-lg text-gray-600">
            Powered by AI to help you find the services you need
          </p>
        </div>

        {/* Crisis Banner */}
        {crisisBanner && (
          <div className="mb-4 rounded-lg bg-red-600 text-white px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                {CRISIS_TYPE_LABELS[crisisBanner.crisis_type] ?? 'Crisis'} Resources Available
              </p>
              {crisisBanner.response_template && (
                <p className="text-sm mt-0.5 opacity-90">{crisisBanner.response_template}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {crisisBanner.emergency_resources.map((r, i) => (
                  <a
                    key={i}
                    href={`tel:${r.phone.replace(/\D/g, '')}`}
                    className="inline-flex items-center gap-1 bg-white text-red-700 rounded px-2 py-1 text-sm font-semibold hover:bg-red-50"
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
                className="text-white/70 hover:text-white text-xl leading-none ml-2"
                aria-label="Dismiss"
              >
                ×
              </button>
            )}
          </div>
        )}

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Message history */}
              <div className="space-y-4 max-h-[500px] overflow-y-auto">
                {messages.map((message, index) => (
                  <div key={index}>
                    <div
                      className={`flex ${
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-4 py-2 ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>

                    {/* Provider results */}
                    {message.providers && message.providers.length > 0 && (
                      <div className="mt-4 space-y-3">
                        {message.providers.map((provider) => (
                          <ProviderCard key={provider.id} provider={provider} sessionId={sessionId} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {isSearching && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg px-4 py-2 flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-gray-600">Searching...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Location bar */}
              <div className="rounded-lg border bg-muted/30 px-3 py-2">
                {locationLabel ? (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-green-600 flex-shrink-0" />
                    <span className="text-green-700 font-medium">{locationLabel}</span>
                    <span className="text-muted-foreground text-xs">— results sorted by distance</span>
                    <button onClick={clearLocation} className="ml-auto text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : showZipInput ? (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      value={zipInput}
                      onChange={(e) => setZipInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && applyZip()}
                      placeholder="Enter ZIP code"
                      className="h-8 text-sm w-36"
                      maxLength={10}
                      autoFocus
                    />
                    <Button size="sm" className="h-8 text-xs" onClick={applyZip} disabled={!zipInput.trim()}>
                      Set Location
                    </Button>
                    <button onClick={() => setShowZipInput(false)} className="ml-auto text-muted-foreground hover:text-foreground">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">Find resources near you:</span>
                    <button
                      onClick={requestGeolocation}
                      disabled={isGeolocating}
                      className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      {isGeolocating
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Navigation className="h-4 w-4" />
                      }
                      {isGeolocating ? 'Locating…' : 'Use my location'}
                    </button>
                    <span className="text-muted-foreground text-sm">or</span>
                    <button
                      onClick={() => setShowZipInput(true)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      Enter ZIP code
                    </button>
                  </div>
                )}
              </div>

              {/* Input area */}
              <div className="flex gap-2">
                <Textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Describe what you need help with..."
                  className="resize-none"
                  rows={3}
                  disabled={isSearching}
                />
                <Button
                  onClick={handleSearch}
                  disabled={!query.trim() || isSearching}
                  className="self-end"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Send'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-gray-500">
          <p>If this is a medical or safety emergency, please dial <strong>911</strong>.</p>
        </div>

        {/* Browse by Category Section */}
        <div className="mt-12">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
              <Sparkles className="h-6 w-6 text-orange-500" />
              Browse by Category
            </h2>
            <p className="text-gray-600">
              Find services organized by type of assistance
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => {
              const visual = getCategoryVisual(category.name)
              const Icon = visual.icon
              const isSelected = selectedCategoryId === category.id

              return (
                <button
                  key={category.id}
                  onClick={() => handleCategoryOpen(category.id)}
                  className={[
                    'text-left rounded-xl border p-4 transition-all duration-200',
                    'shadow-sm hover:shadow-md',
                    visual.cardClass,
                    isSelected ? 'ring-2 ring-offset-1 ring-blue-500 bg-white' : 'bg-white/90',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{category.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {category.providerCount || 0} provider{category.providerCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${visual.chipClass}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                </button>
              )
            })}
          </div>

          {selectedCategory && (
            <Card className="mt-6 border-blue-200 bg-gradient-to-b from-blue-50/60 to-white">
              <CardContent className="pt-6">
                {loadingCategories[selectedCategory.id] ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-600">Loading providers...</span>
                  </div>
                ) : categoryProviders[selectedCategory.id] ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-700">
                      Found {categoryProviders[selectedCategory.id].length} organization
                      {categoryProviders[selectedCategory.id].length !== 1 ? 's' : ''} offering services in{' '}
                      <span className="font-semibold">{selectedCategory.name}</span>.
                    </p>
                    {categoryProviders[selectedCategory.id].length > 0 ? (
                      categoryProviders[selectedCategory.id].map((provider) => (
                        <ProviderCard key={provider.id} provider={provider} sessionId={sessionId} />
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 py-2 text-center">
                        No providers found for this category.
                      </p>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

function ProviderCard({ provider, sessionId }: { provider: SearchResult; sessionId?: string | null }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  function trackInteraction(interactionType: string) {
    fetch('/api/linksy/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider_id: provider.id,
        interaction_type: interactionType,
        session_id: sessionId ?? undefined,
      }),
    }).catch(() => {})
  }
  const location = provider.primaryLocation
  const address = location
    ? `${location.address_line1 || ''}${location.city ? `, ${location.city}` : ''}${location.state ? `, ${location.state}` : ''} ${location.postal_code || ''}`
    : null

  // Get the primary need for this provider from the search context
  const primaryNeed = provider.provider_needs?.[0]?.need

  return (
    <div>
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-xl">{provider.name}</CardTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary">{provider.sector}</Badge>
                {provider.distance !== null ? (
                  <Badge className="flex items-center gap-1 bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100">
                    <MapPin className="h-3 w-3" />
                    {provider.distance} miles away
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </CardHeader>
      <CardContent className="space-y-3">
        {provider.description && (
          <RichTextDisplay content={provider.description} className="text-sm text-gray-700" />
        )}

        {/* Services provided */}
        {provider.provider_needs && provider.provider_needs.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">Services:</p>
            <div className="flex flex-wrap gap-1">
              {provider.provider_needs.slice(0, 5).map((pn) => (
                <Badge key={pn.need.id} variant="outline" className="text-xs">
                  {pn.need.name}
                </Badge>
              ))}
              {provider.provider_needs.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{provider.provider_needs.length - 5} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Contact information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
          {provider.phone && (
            <a
              href={`tel:${provider.phone}`}
              onClick={() => trackInteraction('phone_click')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <Phone className="h-4 w-4" />
              {provider.phone}
            </a>
          )}
          {provider.website && (
            <a
              href={provider.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackInteraction('website_click')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <Globe className="h-4 w-4" />
              Visit Website
            </a>
          )}
          {provider.email && (
            <a
              href={`mailto:${provider.email}`}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <Mail className="h-4 w-4" />
              {provider.email}
            </a>
          )}
          {address && location?.latitude && location?.longitude && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackInteraction('directions_click')}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <Navigation className="h-4 w-4" />
              Get Directions
            </a>
          )}
        </div>

        {address && (
          <p className="text-sm text-gray-600 flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
            {address}
          </p>
        )}

        {provider.hours_of_operation && (
          <p className="text-sm text-gray-600">
            <span className="font-medium">Hours:</span> {provider.hours_of_operation}
          </p>
        )}

        {provider.referral_type === 'contact_directly' && provider.referral_instructions && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
            <p className="text-sm text-yellow-900">
              <span className="font-medium">Note:</span> {provider.referral_instructions}
            </p>
          </div>
        )}

        {/* Request Referral Button */}
        <div className="pt-4 border-t">
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="w-full"
            size="lg"
          >
            <Send className="h-4 w-4 mr-2" />
            Request Referral
          </Button>
        </div>
      </CardContent>
    </Card>

    <CreateTicketDialog
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
      providerId={provider.id}
      providerName={provider.name}
      needId={primaryNeed?.id}
      needName={primaryNeed?.name}
      searchSessionId={sessionId ?? undefined}
    />
    </div>
  )
}
