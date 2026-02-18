# Runbook

## Common Issues

### 1. OpenAI API key missing or invalid — AI search returns errors

**Symptom:** Users see "I'm sorry, I encountered an error while searching" in the widget. The `/api/linksy/search` endpoint returns 500.

**Checks:**
- Verify `OPENAI_API_KEY` is set in Vercel env vars (or `.env.local` for local dev)
- Check Vercel function logs for `"Missing OPENAI_API_KEY"` or OpenAI API errors
- Confirm the key is valid and has billing enabled at `https://platform.openai.com`

**Fix:**
- Set or rotate the `OPENAI_API_KEY` env var
- Redeploy (Vercel functions need a redeploy to pick up new env vars)
- The client is lazy-initialized, so no code change is needed

---

### 2. Host widget token budget exceeded — widget stops responding

**Symptom:** A host provider's embedded widget stops returning search results. The API may return a budget-exceeded error or empty results.

**Checks:**
- In the admin dashboard, navigate to the provider's Host Settings tab
- Check "Tokens This Month" against "Monthly Token Budget"
- Check `linksy_providers.host_tokens_used_this_month` in the database

**Fix:**
- Increase the `host_monthly_token_budget` value for the provider
- Or set it to blank/null for unlimited
- Usage resets automatically at the period boundary (see `host_usage_reset_at`)
- To reset manually: `UPDATE linksy_providers SET host_tokens_used_this_month = 0, host_searches_this_month = 0 WHERE id = '<provider_id>';`

---

### 3. Supabase service role key exposed or RLS bypass issues

**Symptom:** Unauthorized data access, or admin-only operations fail with permission errors.

**Checks:**
- Confirm `SUPABASE_SERVICE_ROLE_KEY` is NOT prefixed with `NEXT_PUBLIC_` (it must be server-only)
- Verify it is only used in `lib/supabase/server.ts` → `createServiceClient()`
- Check that API routes using the service client validate user roles before performing admin operations
- Review Supabase dashboard > Auth > Policies for any overly permissive RLS rules

**Fix:**
- If the key was exposed: rotate it immediately in Supabase dashboard > Settings > API
- Update the env var in Vercel and redeploy
- Audit recent database changes for unauthorized modifications

---

## Health Check Endpoints

- No dedicated health check endpoint exists. The simplest smoke test is:
  - `GET /api/public/directory` — should return provider data without auth
  - `GET /` — should return the landing page (200)

## Useful Database Queries

```sql
-- Check host provider usage
SELECT name, host_searches_this_month, host_tokens_used_this_month, host_monthly_token_budget
FROM linksy_providers
WHERE is_host = true;

-- Recent search sessions
SELECT id, initial_query, total_tokens_used, crisis_detected, created_at
FROM linksy_search_sessions
ORDER BY created_at DESC
LIMIT 20;

-- Providers with no geocoded locations
SELECT p.name, COUNT(l.id) as locations, COUNT(l.geocoded_at) as geocoded
FROM linksy_providers p
LEFT JOIN linksy_locations l ON l.provider_id = p.id
GROUP BY p.name
HAVING COUNT(l.geocoded_at) < COUNT(l.id);
```
