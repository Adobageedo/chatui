-- ============================================================================
-- File Sync / Qdrant Integration
-- Adds sync status tracking columns to file_items for vector indexing.
-- ============================================================================

-- ── New columns ─────────────────────────────────────────────────────────────

ALTER TABLE public.file_items
  ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'processing', 'synced', 'error', 'not_applicable')),
  ADD COLUMN sync_error  TEXT,
  ADD COLUMN synced_at   TIMESTAMPTZ,
  ADD COLUMN content_hash TEXT,
  ADD COLUMN chunk_count  INTEGER NOT NULL DEFAULT 0;

-- Folders and unsupported files should be "not_applicable" by default.
-- We fix existing folders immediately:
UPDATE public.file_items SET sync_status = 'not_applicable' WHERE type = 'folder';

-- ── Indexes ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_file_items_sync_status
  ON public.file_items(sync_status)
  WHERE sync_status IN ('pending', 'processing', 'error');

CREATE INDEX idx_file_items_content_hash
  ON public.file_items(content_hash)
  WHERE content_hash IS NOT NULL;

-- ── Trigger: auto-set sync_status on INSERT ─────────────────────────────────
-- Folders → not_applicable, files → pending (so the pipeline picks them up).

CREATE OR REPLACE FUNCTION public.set_initial_sync_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'folder' THEN
    NEW.sync_status := 'not_applicable';
  ELSE
    NEW.sync_status := 'pending';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_file_items_set_sync_status
  BEFORE INSERT ON public.file_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_initial_sync_status();

-- ── Comments ────────────────────────────────────────────────────────────────

COMMENT ON COLUMN public.file_items.sync_status IS 'Vector index sync state: pending, processing, synced, error, not_applicable';
COMMENT ON COLUMN public.file_items.sync_error IS 'Error message if sync_status = error';
COMMENT ON COLUMN public.file_items.synced_at IS 'Timestamp of last successful sync to Qdrant';
COMMENT ON COLUMN public.file_items.content_hash IS 'SHA-256 hash of file content for change detection';
COMMENT ON COLUMN public.file_items.chunk_count IS 'Number of text chunks indexed in Qdrant';
