-- ============================================================================
-- TARGETED SECURITY & PERFORMANCE MIGRATION
-- Applied 2026-02-17
--
-- The Linksy database was already fully built (all 15+ tables, extensions,
-- indexes, and most RLS policies). This migration closes the remaining gaps:
--
-- 1. Enable RLS on 3 tables where it was missing
-- 2. Add admin + provider policies for support ticket tables
-- 3. Add IVFFlat vector indexes for embedding-based semantic search
-- ============================================================================

-- ============================================================================
-- 1. ENABLE RLS ON TABLES MISSING IT
-- ============================================================================

-- linksy_provider_contacts already had policies but RLS was never enabled
ALTER TABLE public.linksy_provider_contacts ENABLE ROW LEVEL SECURITY;

-- linksy_support_tickets: internal support system
ALTER TABLE public.linksy_support_tickets ENABLE ROW LEVEL SECURITY;

-- linksy_support_ticket_comments
ALTER TABLE public.linksy_support_ticket_comments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. ADD POLICIES FOR SUPPORT TABLES (no policies existed)
-- ============================================================================

-- Site admins manage all support tickets
CREATE POLICY "support_tickets_admin_all" ON public.linksy_support_tickets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'site_admin'
        )
    );

-- Providers can view their own support tickets
CREATE POLICY "support_tickets_provider_read" ON public.linksy_support_tickets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.linksy_provider_contacts pc
            WHERE pc.user_id = auth.uid()
              AND pc.provider_id = linksy_support_tickets.provider_id
              AND pc.status = 'active'
        )
    );

-- Site admins manage all support ticket comments
CREATE POLICY "support_ticket_comments_admin_all" ON public.linksy_support_ticket_comments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid() AND role = 'site_admin'
        )
    );

-- Providers can view comments on their own tickets
CREATE POLICY "support_ticket_comments_provider_read" ON public.linksy_support_ticket_comments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.linksy_support_tickets st
            JOIN public.linksy_provider_contacts pc ON pc.provider_id = st.provider_id
            WHERE st.id = ticket_id
              AND pc.user_id = auth.uid()
              AND pc.status = 'active'
        )
    );

-- Providers can add comments on their own tickets
CREATE POLICY "support_ticket_comments_provider_insert" ON public.linksy_support_ticket_comments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.linksy_support_tickets st
            JOIN public.linksy_provider_contacts pc ON pc.provider_id = st.provider_id
            WHERE st.id = ticket_id
              AND pc.user_id = auth.uid()
              AND pc.status = 'active'
        )
    );

-- ============================================================================
-- 3. ADD IVFFLAT VECTOR INDEXES FOR EMBEDDING SEARCH
-- ============================================================================

-- Needs embedding index (for semantic need matching via pgvector)
CREATE INDEX IF NOT EXISTS idx_linksy_needs_embedding
    ON public.linksy_needs
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 50);

-- Providers embedding index (for semantic provider matching via pgvector)
CREATE INDEX IF NOT EXISTS idx_linksy_providers_embedding
    ON public.linksy_providers
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
