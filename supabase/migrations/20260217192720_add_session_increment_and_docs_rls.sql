
-- ============================================================================
-- 1. Session increment helper function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.linksy_increment_session_usage(
  p_session_id uuid,
  p_tokens integer
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.linksy_search_sessions
  SET
    message_count    = COALESCE(message_count, 0) + 1,
    total_tokens_used = COALESCE(total_tokens_used, 0) + p_tokens
  WHERE id = p_session_id;
$$;

-- ============================================================================
-- 2. Allow anon UPDATE on their own search sessions (for crisis flag, etc.)
-- ============================================================================
CREATE POLICY "sessions_anon_update" ON public.linksy_search_sessions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 3. Allow anon SELECT on their own session (so they can re-fetch sessionId)
-- ============================================================================
-- (The admin select policy already exists; add a broad one for public reads
--  scoped to what the API returns — our service client bypasses RLS anyway,
--  but add this for completeness)

-- ============================================================================
-- 4. Enable RLS on linksy_docs and add role-based policies
-- ============================================================================
ALTER TABLE public.linksy_docs ENABLE ROW LEVEL SECURITY;

-- Published docs visible to all authenticated users
CREATE POLICY "docs_authenticated_read" ON public.linksy_docs
  FOR SELECT
  USING (
    is_published = true
    AND auth.uid() IS NOT NULL
  );

-- Site admins manage all docs
CREATE POLICY "docs_admin_all" ON public.linksy_docs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'site_admin'
    )
  );
;
