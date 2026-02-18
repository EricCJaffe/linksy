# 0001 AI Search Pipeline Architecture

## Date
2024-02-16

## Status
Accepted

## Context

Linksy needs to match natural-language queries like "I need help with food" to relevant
local providers. The system must handle fuzzy intent (synonyms, varied phrasing), geographic
proximity, and crisis detection — and present results conversationally.

Options considered:
1. **Keyword search only** (pg_trgm) — fast but misses semantic intent
2. **Full LLM routing** (send everything to GPT) — accurate but slow and expensive
3. **Hybrid: vector similarity + LLM synthesis** — balances cost, speed, and accuracy

## Decision

We chose a hybrid pipeline implemented in `app/api/linksy/search/route.ts`:

1. **Crisis check** — runs in parallel with search; matches keywords against `linksy_crisis_keywords` table
2. **Query embedding** — `text-embedding-3-small` embeds the user query
3. **Vector similarity search** — `linksy_search_needs` RPC finds matching needs (threshold 0.5)
4. **Provider resolution** — matched needs → `linksy_provider_needs` → providers
5. **Ring-based proximity** — `linksy_nearby_provider_ids` RPC filters by distance (10mi → 25mi → 50mi rings)
6. **LLM synthesis** — `gpt-4o-mini` generates a conversational response from provider context cards
7. **Session tracking** — fire-and-forget usage logging to `linksy_search_sessions`

The OpenAI client is lazy-initialized to avoid build-time failures when the key isn't set.

## Consequences

- **Cost:** ~$0.001 per search (embedding) + ~$0.005 per response (gpt-4o-mini). Host providers have configurable monthly token budgets.
- **Latency:** ~1-3s total (embedding + DB + LLM). Crisis check runs in parallel so it adds no latency.
- **Accuracy tradeoff:** Vector search with 0.5 threshold may miss very novel phrasings. The ring-based approach ensures geographic relevance but may return no results in sparse areas.
- **Dependency:** Hard dependency on OpenAI API for search functionality. If the API is down, search is unavailable (graceful error message shown).
- **Future:** Could add a keyword fallback (pg_trgm) when vector search returns no results.

## Links
- `app/api/linksy/search/route.ts` — main search pipeline
- `lib/types/linksy.ts` — `HostWidgetConfig` (budget controls)
- `FEATURES_CHECKLIST.md` §5.3 — conversation flow spec
