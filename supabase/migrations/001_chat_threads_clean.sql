-- ============================================================================
-- Chat Threads System - Clean Migration
-- Multi-thread conversation persistence for assistant-ui
-- ============================================================================

-- ============================================================================
-- CLEANUP - Drop everything completely
-- ============================================================================

-- Drop existing tables with CASCADE to remove all dependencies
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_threads CASCADE;

-- Drop any remaining triggers (only if tables exist)
-- Note: We skip these for now since tables don't exist yet

-- Drop any remaining functions
DROP FUNCTION IF EXISTS public.update_chat_thread_updated_at();

-- Drop any remaining policies on chat tables (only if tables exist)
-- Note: We skip these for now since tables don't exist yet

-- ============================================================================
-- TABLES
-- ============================================================================

-- Chat Threads Table
-- Stores conversation threads with metadata
CREATE TABLE public.chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Ownership
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Thread metadata
    title TEXT,
    external_id TEXT, -- Optional external identifier
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat Messages Table
-- Stores individual messages within threads
CREATE TABLE public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Thread relationship
    thread_id UUID NOT NULL REFERENCES public.chat_threads(id) ON DELETE CASCADE,
    
    -- Message data
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content JSONB NOT NULL, -- Stores message content (text, tool calls, etc.)
    
    -- Optional metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Threads indexes for performance
CREATE INDEX idx_chat_threads_organization_id ON public.chat_threads(organization_id);
CREATE INDEX idx_chat_threads_user_id ON public.chat_threads(user_id);
CREATE INDEX idx_chat_threads_is_archived ON public.chat_threads(is_archived);
CREATE INDEX idx_chat_threads_created_at ON public.chat_threads(created_at DESC);
CREATE INDEX idx_chat_threads_updated_at ON public.chat_threads(updated_at DESC);

-- Messages indexes for performance
CREATE INDEX idx_chat_messages_thread_id ON public.chat_messages(thread_id);
CREATE INDEX idx_chat_messages_created_at ON public.chat_messages(thread_id, created_at ASC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- NOTE: RLS is DISABLED by default on all tables in Supabase
-- We enable RLS ONLY for chat tables to secure conversation data
-- All other tables remain with RLS disabled for flexibility

-- Enable RLS for chat tables only
ALTER TABLE public.chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Threads policies
CREATE POLICY "Users can view their own organization's threads"
    ON public.chat_threads
    FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_users 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create threads in their organization"
    ON public.chat_threads
    FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id 
            FROM public.organization_users 
            WHERE user_id = auth.uid()
        )
        AND user_id = auth.uid()
    );

CREATE POLICY "Users can update their own threads"
    ON public.chat_threads
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own threads"
    ON public.chat_threads
    FOR DELETE
    USING (user_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view messages in their threads"
    ON public.chat_messages
    FOR SELECT
    USING (
        thread_id IN (
            SELECT id 
            FROM public.chat_threads 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM public.organization_users 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can create messages in their threads"
    ON public.chat_messages
    FOR INSERT
    WITH CHECK (
        thread_id IN (
            SELECT id 
            FROM public.chat_threads 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update messages in their threads"
    ON public.chat_messages
    FOR UPDATE
    USING (
        thread_id IN (
            SELECT id 
            FROM public.chat_threads 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete messages in their threads"
    ON public.chat_messages
    FOR DELETE
    USING (
        thread_id IN (
            SELECT id 
            FROM public.chat_threads 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update thread's updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_chat_thread_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.chat_threads
    SET updated_at = NOW()
    WHERE id = NEW.thread_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update thread timestamp when messages are added
CREATE TRIGGER trigger_update_chat_thread_updated_at
    AFTER INSERT ON public.chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_chat_thread_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.chat_threads IS 'Conversation threads for the AI assistant chat interface';
COMMENT ON TABLE public.chat_messages IS 'Individual messages within conversation threads';

COMMENT ON COLUMN public.chat_threads.title IS 'Auto-generated or user-defined thread title';
COMMENT ON COLUMN public.chat_threads.external_id IS 'Optional external identifier for integration purposes';
COMMENT ON COLUMN public.chat_threads.is_archived IS 'Whether the thread has been archived';

COMMENT ON COLUMN public.chat_messages.role IS 'Message role: user, assistant, system, or tool';
COMMENT ON COLUMN public.chat_messages.content IS 'Message content stored as JSONB (supports text, tool calls, etc.)';
COMMENT ON COLUMN public.chat_messages.metadata IS 'Optional metadata for the message';
