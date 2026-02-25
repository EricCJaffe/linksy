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

### 3. API requests fail with 403 "Invalid request origin" (CSRF)

**Symptom:** Browser/API clients can log in but POST/PATCH/DELETE calls fail with 403 from middleware.

**Checks:**
- Confirm `NEXT_PUBLIC_SITE_URL` is set to your active app origin
- Confirm deploy URL/origin matches `Origin`/`Referer` headers being sent
- Verify `VERCEL_URL` exists in deployed environment (used by `lib/middleware/csrf.ts` allowed origins)
- Reproduce against a state-changing route like `POST /api/tickets`

**Fix:**
- Set/correct `NEXT_PUBLIC_SITE_URL` and redeploy
- Ensure frontend calls API from the same origin (or valid allowed origin)
- For local dev, use consistent host/port (for example `http://localhost:3000`)

---

### 4. `supabase db push` fails due to legacy migration files

**Symptom:** CLI prompts to apply unexpected migrations (for example legacy `003_*.sql`) or fails with missing relation/function errors from old SQL.

**Checks:**
- Run `supabase migration list` and compare local vs remote versions.
- Inspect `supabase/migrations/` for non-timestamp or legacy files that should not run.
- Look for skipped warnings such as `file name must match pattern "<timestamp>_name.sql"`.

**Fix:**
- Move legacy/backfill SQL out of `supabase/migrations/` into archive location (for example `supabase/_archive/`).
- Re-run `supabase db push --include-all --yes`.
- If migration history is already out of sync, run `supabase migration repair --status applied <versions...>` to align history after verifying remote state.

---

### 5. E2E tests fail with authentication errors

**Symptom:** `npm run test:e2e` shows test skips or auth failures in `referral-workflow.spec.ts`.

**Checks:**
- Verify `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` are set in `.env.local` (for local) or GitHub Secrets (for CI)
- Confirm the admin user exists in Supabase `users` table with `role = 'site_admin'`
- Check that the credentials match an actual user account
- Run `npm run dev` first — E2E tests require a running dev server at `http://localhost:3000`

**Fix:**
- Set env vars: `E2E_ADMIN_EMAIL=admin@example.com` and `E2E_ADMIN_PASSWORD=<password>`
- Create admin user if missing (signup + promote to site_admin in Supabase dashboard)
- Ensure dev server is running before executing `npm run test:e2e`
- For CI: add `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD` to GitHub Secrets

---

### 6. Host widget URLs return 404 "Page Not Found"

**Symptom:** Visiting `/find-help/[provider-slug]` returns 404 even though the provider has `is_host = true`, `is_active = true`, and `host_embed_active = true`.

**Checks:**
- Verify the provider exists with the correct slug in `linksy_providers` table
- Confirm `is_host = true`, `is_active = true`, and `host_embed_active = true`
- Test the RPC function: `SELECT * FROM linksy_resolve_host('provider-slug');` (should return 1 row)
- Check Vercel deployment logs for build errors related to dynamic routes

**Root Cause:**
Next.js App Router tries to statically generate pages at build time. Without `dynamic = 'force-dynamic'`, dynamic routes like `/find-help/[slug]` will not be generated at runtime, causing 404s for any slug not pre-generated.

**Fix:**
The page at `app/find-help/[slug]/page.tsx` must export:
```typescript
export const dynamic = 'force-dynamic'
export const dynamicParams = true
```

This tells Next.js to:
- Always render this page on-demand (server-side)
- Accept any dynamic slug parameter without pre-generation

**Verification:**
1. Deploy with the fix included
2. Visit `https://your-domain.com/find-help/provider-slug`
3. Should load the widget instead of 404
4. Widget URL is shown in provider Host Settings tab

**Related Migration:**
- `supabase/migrations/20260217160235_linksy_host_system.sql` - Creates host system
- `supabase/migrations/20260218205438_resolve_host_return_allowed_domains.sql` - RPC function

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
