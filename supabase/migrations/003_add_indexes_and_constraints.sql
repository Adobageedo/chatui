-- Migration: Add Performance Indexes and Data Integrity Constraints
-- Description: Optimize database performance and ensure data integrity
-- Author: Senior Dev
-- Date: 2024-01-05

-- ============================================================================
-- CHAT THREADS INDEXES
-- ============================================================================

-- Index for faster thread lookups by user
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_id 
    ON public.chat_threads(user_id);

-- Index for ordering by updated_at (most recent first)
CREATE INDEX IF NOT EXISTS idx_chat_threads_updated_at 
    ON public.chat_threads(updated_at DESC);

-- Index for filtering archived threads
CREATE INDEX IF NOT EXISTS idx_chat_threads_archived 
    ON public.chat_threads(is_archived);

-- Composite index for user's active threads
CREATE INDEX IF NOT EXISTS idx_chat_threads_user_active 
    ON public.chat_threads(user_id, is_archived, updated_at DESC)
    WHERE is_archived = FALSE;

-- ============================================================================
-- CHAT MESSAGES INDEXES
-- ============================================================================

-- Index for faster message lookups by thread
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id 
    ON public.chat_messages(thread_id);

-- Index for ordering messages by sequence
CREATE INDEX IF NOT EXISTS idx_chat_messages_sequence 
    ON public.chat_messages(thread_id, sequence_number ASC);

-- Index for message role filtering
CREATE INDEX IF NOT EXISTS idx_chat_messages_role 
    ON public.chat_messages(role);

-- Composite index for thread message retrieval
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_sequence 
    ON public.chat_messages(thread_id, sequence_number ASC, created_at ASC);

-- ============================================================================
-- DATA INTEGRITY CONSTRAINTS
-- ============================================================================

-- Ensure thread titles are not empty
ALTER TABLE public.chat_threads
    ADD CONSTRAINT check_thread_title_not_empty 
    CHECK (LENGTH(TRIM(title)) > 0);

-- Ensure thread titles are reasonable length
ALTER TABLE public.chat_threads
    ADD CONSTRAINT check_thread_title_length 
    CHECK (LENGTH(title) <= 500);

-- Ensure message content is not empty
ALTER TABLE public.chat_messages
    ADD CONSTRAINT check_message_content_not_empty 
    CHECK (content IS NOT NULL AND content::text != '{}');

-- Ensure sequence numbers are positive
ALTER TABLE public.chat_messages
    ADD CONSTRAINT check_sequence_positive 
    CHECK (sequence_number > 0);

-- ============================================================================
-- PERFORMANCE: Partial Indexes
-- ============================================================================

-- Index only non-archived threads for faster active thread queries
CREATE INDEX IF NOT EXISTS idx_chat_threads_active_only 
    ON public.chat_threads(user_id, updated_at DESC)
    WHERE is_archived = FALSE;

-- Index only user messages for analytics
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_only 
    ON public.chat_messages(thread_id, created_at DESC)
    WHERE role = 'user';

-- ============================================================================
-- STATISTICS AND MAINTENANCE
-- ============================================================================

-- Analyze tables to update query planner statistics
ANALYZE public.chat_threads;
ANALYZE public.chat_messages;
ANALYZE public.user_profiles;

-- Add comments for documentation
COMMENT ON INDEX idx_chat_threads_user_id IS 'Optimizes thread lookups by user';
COMMENT ON INDEX idx_chat_threads_user_active IS 'Optimizes active thread queries';
COMMENT ON INDEX idx_chat_messages_thread_sequence IS 'Optimizes message retrieval in order';
COMMENT ON CONSTRAINT check_thread_title_not_empty ON public.chat_threads IS 'Prevents empty thread titles';
COMMENT ON CONSTRAINT check_sequence_positive ON public.chat_messages IS 'Ensures valid message sequence numbers';
