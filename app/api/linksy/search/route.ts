import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { geocodeAddress } from '@/lib/utils/geocode'
import { checkRateLimit } from '@/lib/utils/rate-limit'
import OpenAI from 'openai'

function getOpenAI() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
}

/**
 * POST /api/linksy/search
 * AI-powered search for providers based on natural language query
 *
 * Body:
 * - query: string (natural language description of need)
 * - location: { lat: number, lng: number } (optional)
 * - zipCode: string (optional)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { query, location, zipCode, hostProviderId, sessionId } = body

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 })
    }

    // Check host's excluded search terms
    if (hostProviderId) {
      const supabaseForExclusion = await createServiceClient()
      const { data: hostData } = await supabaseForExclusion
        .from('linksy_providers')
        .select('excluded_search_terms')
        .eq('id', hostProviderId)
        .single()

      const excludedTerms: string[] = hostData?.excluded_search_terms || []
      const queryLower = query.trim().toLowerCase()
      const isExcluded = excludedTerms.some((term: string) =>
        queryLower.includes(term.toLowerCase())
      )

      if (isExcluded) {
        return NextResponse.json({
          query,
          needs: [],
          providers: [],
          message: "I'm sorry, I can't help with that specific request through this service. Please contact 211 or your local community resource center for assistance.",
          filtered: true,
        })
      }
    }

    // Resolve location: use explicit lat/lng if provided, otherwise geocode the zipCode
    let resolvedLocation: { lat: number; lng: number } | null = location ?? null
    if (!resolvedLocation && zipCode) {
      const geo = await geocodeAddress(zipCode)
      if (geo) {
        resolvedLocation = { lat: geo.latitude, lng: geo.longitude }
      }
    }

    const supabase = await createServiceClient()

    // Host-level controls for embedded widget usage (no API keys required)
    if (hostProviderId) {
      const { data: host, error: hostError } = await supabase
        .from('linksy_providers')
        .select(
          'id, is_host, is_active, host_embed_active, host_monthly_token_budget, host_tokens_used_this_month, host_widget_config'
        )
        .eq('id', hostProviderId)
        .single()

      if (hostError || !host || !host.is_host || !host.is_active || !host.host_embed_active) {
        return NextResponse.json({ error: 'Invalid or inactive host context' }, { status: 403 })
      }

      const overBudget =
        host.host_monthly_token_budget != null &&
        host.host_tokens_used_this_month >= host.host_monthly_token_budget
      if (overBudget) {
        return NextResponse.json(
          { error: 'Monthly search budget reached for this host' },
          { status: 429 }
        )
      }

      const hostConfig = (host.host_widget_config || {}) as Record<string, any>
      const perMinuteLimit =
        typeof hostConfig.search_rate_limit_per_minute === 'number' &&
        hostConfig.search_rate_limit_per_minute > 0
          ? hostConfig.search_rate_limit_per_minute
          : 60

      const forwardedFor = request.headers.get('x-forwarded-for')
      const requestIp = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'
      const rateLimit = checkRateLimit(`host-search:${hostProviderId}:${requestIp}`, perMinuteLimit, 60 * 1000)

      if (!rateLimit.success) {
        return NextResponse.json(
          { error: 'Search rate limit exceeded for this host. Please try again shortly.' },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateLimit.limit.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': rateLimit.reset.toISOString(),
            },
          }
        )
      }
    }

    // Step 1: Generate embedding for the user's query
    const openai = getOpenAI()
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: query.trim(),
    })

    const queryEmbedding = embeddingResponse.data[0].embedding

    // Step 2: Search for matching needs using vector similarity
    const { data: matchingNeeds, error: needsError } = await supabase.rpc(
      'linksy_search_needs',
      {
        query_embedding: queryEmbedding,
        match_threshold: 0.5, // Similarity threshold (0-1)
        match_count: 5, // Top 5 matching needs
        p_site_id: null, // For now, search all needs
      }
    )

    if (needsError) {
      console.error('Error searching needs:', needsError)
      return NextResponse.json(
        { error: 'Failed to search needs' },
        { status: 500 }
      )
    }

    if (!matchingNeeds || matchingNeeds.length === 0) {
      return NextResponse.json({
        query,
        needs: [],
        providers: [],
        message: "I couldn't find any matching services for your request. Could you try describing your need in a different way?",
      })
    }

    // Step 3: Find providers that offer these needs
    const needIds = matchingNeeds.map((n: any) => n.id)

    // Step 3a: Ring-based proximity filter when location is available.
    // Try 10 mi → 25 mi → 50 mi. Use the smallest ring that has ≥ 2 providers.
    // If nothing within 50 mi, skip the geo filter and return all (with distances shown).
    let nearbyProviderIds: string[] | null = null
    let searchRadiusMiles: number | null = null

    if (resolvedLocation) {
      for (const radiusMiles of [10, 25, 50]) {
        const { data: nearby } = await supabase.rpc('linksy_nearby_provider_ids', {
          lat: resolvedLocation.lat,
          lng: resolvedLocation.lng,
          radius_meters: radiusMiles * 1609.34,
        })
        const ids = (nearby || []) as string[]
        if (ids.length >= 2) {
          nearbyProviderIds = ids
          searchRadiusMiles = radiusMiles
          break
        }
        // Keep the best we found even if < 2, in case nothing better exists
        if (ids.length > 0 && nearbyProviderIds === null) {
          nearbyProviderIds = ids
          searchRadiusMiles = radiusMiles
        }
      }
    }

    const providerSelect = `
      id,
      name,
      description,
      phone,
      email,
      website,
      hours_of_operation,
      sector,
      referral_type,
      referral_instructions,
      llm_context_card,
      is_active,
      service_zip_codes,
      provider_needs:linksy_provider_needs!inner(
        need_id,
        need:linksy_needs(id, name)
      ),
      locations:linksy_locations(
        id,
        name,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        is_primary,
        latitude,
        longitude
      )
    `

    let providersQuery = supabase
      .from('linksy_providers')
      .select(providerSelect)
      .eq('provider_status', 'active')
      .in('provider_needs.need_id', needIds)
      .limit(10)

    // Apply proximity filter only when we have matching nearby providers
    if (nearbyProviderIds !== null && nearbyProviderIds.length > 0) {
      providersQuery = providersQuery.in('id', nearbyProviderIds)
    }

    const { data: providers, error: providersError } = await providersQuery

    if (providersError) {
      console.error('Error fetching providers:', providersError)
      return NextResponse.json(
        { error: 'Failed to fetch providers' },
        { status: 500 }
      )
    }

    // Step 3b: Filter by service ZIP codes if client provided a ZIP
    // Providers with null/empty service_zip_codes serve all areas
    let filteredProviders = providers || []
    const excludedProviders: any[] = []

    if (zipCode) {
      const clientZip = zipCode.trim()
      const inServiceArea: any[] = []
      const outOfServiceArea: any[] = []

      filteredProviders.forEach((provider: any) => {
        const serviceZips = provider.service_zip_codes
        // null or empty array means serves all areas
        if (!serviceZips || serviceZips.length === 0) {
          inServiceArea.push(provider)
        } else if (serviceZips.includes(clientZip)) {
          inServiceArea.push(provider)
        } else {
          outOfServiceArea.push(provider)
        }
      })

      filteredProviders = inServiceArea
      excludedProviders.push(...outOfServiceArea)
    }

    // Step 4: Attach distance to every result and sort closest-first
    let resultsWithDistance = filteredProviders.map((provider: any) => {
      const primaryLocation = provider.locations?.find((l: any) => l.is_primary) || provider.locations?.[0]
      const distance =
        resolvedLocation && primaryLocation?.latitude && primaryLocation?.longitude
          ? calculateDistance(
              resolvedLocation.lat,
              resolvedLocation.lng,
              primaryLocation.latitude,
              primaryLocation.longitude
            )
          : null
      return { ...provider, distance, primaryLocation }
    })

    if (resolvedLocation) {
      resultsWithDistance = resultsWithDistance.sort((a: any, b: any) => {
        if (a.distance === null) return 1
        if (b.distance === null) return -1
        return a.distance - b.distance
      })
    }

    // Step 5: Generate conversational response
    const topProviders = resultsWithDistance.slice(0, 5)
    const conversationalResponse = await generateConversationalResponse(
      query,
      matchingNeeds,
      topProviders,
      resolvedLocation !== null,
      searchRadiusMiles
    )

    // Strip llm_context_card from provider objects before sending to client
    const topProvidersForClient = topProviders.map(({ llm_context_card: _card, ...rest }: any) => rest)

    // Step 6: Session tracking (fire-and-forget)
    const tokensUsed = embeddingResponse.usage?.total_tokens ?? 0
    let activeSessionId: string | null = sessionId ?? null

    const SITE_ID = '86bd8d01-0dc5-4479-beff-666712654104'

    // Create session on first message (no sessionId provided)
    if (!activeSessionId) {
      const sessionInsert: Record<string, any> = {
        site_id: SITE_ID,
        initial_query: query.trim(),
        message_count: 1,
        total_tokens_used: tokensUsed,
        model_used: 'text-embedding-3-small',
      }
      if (resolvedLocation) {
        sessionInsert.user_location = `(${resolvedLocation.lng},${resolvedLocation.lat})`
      }
      if (zipCode) sessionInsert.zip_code_searched = zipCode
      if (hostProviderId) sessionInsert.host_provider_id = hostProviderId
      if (resolvedLocation && searchRadiusMiles) {
        sessionInsert.search_radius_miles = searchRadiusMiles
      }

      const { data: newSession } = await supabase
        .from('linksy_search_sessions')
        .insert(sessionInsert)
        .select('id')
        .single()
      activeSessionId = newSession?.id ?? null
    } else {
      // Increment message count and token usage atomically
      void supabase.rpc('linksy_increment_session_usage', {
        p_session_id: activeSessionId,
        p_tokens: tokensUsed,
      })
    }

    // Record host usage (fire-and-forget)
    if (hostProviderId) {
      void supabase.rpc('linksy_increment_host_usage', {
        p_host_provider_id: hostProviderId,
        p_tokens_used: tokensUsed,
      })
    }

    // Include info about providers excluded due to ZIP code restrictions
    const excludedByZip = excludedProviders.map((p: any) => ({
      id: p.id,
      name: p.name,
      service_zip_codes: p.service_zip_codes,
    }))

    return NextResponse.json({
      query,
      needs: matchingNeeds,
      providers: topProvidersForClient,
      message: conversationalResponse,
      searchRadiusMiles,
      sessionId: activeSessionId,
      excludedByZip: excludedByZip.length > 0 ? excludedByZip : undefined,
      clientZipCode: zipCode || undefined,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json(
      { error: 'An error occurred while searching' },
      { status: 500 }
    )
  }
}

// Haversine formula to calculate distance between two lat/lng points in miles
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959 // Earth's radius in miles
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return Math.round(distance * 10) / 10 // Round to 1 decimal place
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180)
}

async function generateConversationalResponse(
  query: string,
  needs: any[],
  providers: any[],
  hasLocation: boolean,
  searchRadiusMiles: number | null
): Promise<string> {
  if (providers.length === 0) {
    if (hasLocation) {
      return `I couldn't find any providers for "${query}" near your location. Try expanding your search or contact 211 for additional resources.`
    }
    return `I couldn't find any providers for "${query}". You might want to try describing your need differently, or contact 211 for additional resources.`
  }

  // Use AI-powered response if any provider has a context card
  const contextCards = providers
    .filter((p: any) => p.llm_context_card)
    .map((p: any) => p.llm_context_card)
    .join('\n\n---\n\n')

  if (contextCards) {
    try {
      const locationNote = hasLocation && searchRadiusMiles
        ? ` Results are sorted by distance within ${searchRadiusMiles} miles.`
        : !hasLocation
        ? ' Location not provided — results are not sorted by distance.'
        : ''

      const completion = await getOpenAI().chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful community resource navigator. Based on the user\'s query and the available providers shown below, write a brief, warm conversational response (2-3 sentences max). Do NOT list the providers — they are shown in cards below your message. Focus on acknowledging what the user needs and noting what types of help are available.',
          },
          {
            role: 'user',
            content: `User query: "${query}"\n\nAvailable providers:\n\n${contextCards}\n\n${locationNote}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.5,
      })
      const aiMessage = completion.choices[0]?.message?.content?.trim()
      if (aiMessage) return aiMessage
    } catch (err) {
      console.error('AI response generation failed, falling back to template:', err)
    }
  }

  // Fallback template response
  const needNames = needs.slice(0, 3).map((n: any) => n.name).join(', ')
  const providerCount = providers.length
  let response = `I found ${providerCount} ${providerCount === 1 ? 'organization' : 'organizations'} that can help with ${needNames}. `

  if (hasLocation && searchRadiusMiles) {
    response += `Showing the closest results within ${searchRadiusMiles} miles:`
  } else if (hasLocation) {
    response += `No providers were found nearby, so here are the closest matches from a wider area:`
  } else {
    response += `Here are some options (add your location to see results sorted by distance):`
  }

  return response
}
