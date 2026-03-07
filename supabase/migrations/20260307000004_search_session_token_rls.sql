-- Fix LOW audit finding: linksy_search_sessions anon update has no row filter.
-- Adds a session_token UUID column so RLS can verify the caller owns the session.
-- The token is generated on insert and must be provided on update.

-- 1. Add session_token column
ALTER TABLE linksy_search_sessions
  ADD COLUMN IF NOT EXISTS session_token UUID NOT NULL DEFAULT gen_random_uuid();

-- 2. Backfill existing rows with unique tokens
UPDATE linksy_search_sessions SET session_token = gen_random_uuid() WHERE session_token IS NULL;

-- 3. Index for lookups
CREATE INDEX IF NOT EXISTS idx_search_sessions_token ON linksy_search_sessions (session_token);

-- 4. Replace the overly-permissive anon update policy
DROP POLICY IF EXISTS "search_sessions_anon_update" ON linksy_search_sessions;
DROP POLICY IF EXISTS "sessions_anon_update" ON linksy_search_sessions;

-- Anon users can only update a session if they provide the matching session_token
-- via a custom Postgres setting (set by the API before the query).
-- Service-role clients bypass RLS entirely, so the search API is unaffected.
CREATE POLICY "search_sessions_anon_update"
  ON linksy_search_sessions FOR UPDATE
  USING (
    session_token::text = coalesce(current_setting('app.session_token', true), '')
  )
  WITH CHECK (true);
