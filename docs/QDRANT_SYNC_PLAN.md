# Qdrant Sync & Embeddings Architecture

## Overview

Every file uploaded to the drive goes through a pipeline: **extract → chunk → embed → index in Qdrant**. The system tracks sync status per file so the UI can show whether a file (or folder) is indexed and searchable.

---

## 1. Database Schema Changes

### New columns on `file_items`

```sql
ALTER TABLE public.file_items ADD COLUMN sync_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'processing', 'synced', 'error', 'not_applicable'));
ALTER TABLE public.file_items ADD COLUMN sync_error TEXT;
ALTER TABLE public.file_items ADD COLUMN synced_at TIMESTAMPTZ;
ALTER TABLE public.file_items ADD COLUMN content_hash TEXT;  -- SHA-256 of file content, used for change detection
ALTER TABLE public.file_items ADD COLUMN chunk_count INTEGER DEFAULT 0;
```

| Value | Meaning |
|---|---|
| `pending` | File uploaded/modified, not yet processed |
| `processing` | Extraction + embedding in progress |
| `synced` | All chunks indexed in Qdrant |
| `error` | Pipeline failed (see `sync_error`) |
| `not_applicable` | Folders, or unsupported mime types |

### Why `content_hash`?

When a file is re-uploaded or replaced, we hash the new content. If the hash matches, skip re-processing. If different, set `sync_status = 'pending'` and trigger the pipeline again.

---

## 2. Extraction Pipeline (Backend)

### Supported formats & extractors

| Mime type | Extractor | Library |
|---|---|---|
| `application/pdf` | PDF text extraction | `pdf-parse` or `@extractus/pdf-extractor` |
| `image/*` | OCR | Google Vision API / Tesseract.js / OpenAI Vision |
| `text/plain`, `text/csv`, `text/markdown` | Direct read | Built-in |
| `application/vnd.openxmlformats-officedocument.*` | DOCX/XLSX parse | `mammoth` (docx), `xlsx` |
| Unsupported types | Mark as `not_applicable` | — |

### Pipeline steps

```
File Upload / File Update
  │
  ├─ 1. Set sync_status = 'pending'
  │
  ├─ 2. Background job picks up pending files
  │     ├─ Download file from Supabase Storage
  │     ├─ Compute content_hash (SHA-256)
  │     ├─ If hash unchanged → set 'synced', skip
  │     ├─ Extract raw text (extractor by mime type)
  │     ├─ Chunk text (sliding window, ~500 tokens, 50 overlap)
  │     └─ Set sync_status = 'processing'
  │
  ├─ 3. Embed each chunk
  │     ├─ OpenAI text-embedding-3-small (or ada-002)
  │     └─ Batch API call (up to 2048 inputs)
  │
  ├─ 4. Upsert into Qdrant
  │     ├─ Collection: "file_chunks"
  │     ├─ Point ID: deterministic UUID from file_id + chunk_index
  │     ├─ Vector: embedding
  │     └─ Payload: see §3
  │
  └─ 5. Update file_items row
        ├─ sync_status = 'synced'
        ├─ synced_at = NOW()
        ├─ content_hash = new hash
        └─ chunk_count = N
```

### Triggering the pipeline

**Option A — Supabase Edge Function + DB webhook**
- A Postgres trigger fires on `INSERT` or `UPDATE` of `file_items` when `type = 'file'`
- Calls a Supabase Edge Function or enqueues to a job queue (pg_cron, Inngest, Trigger.dev)

**Option B — API route + background job**
- After upload/update, the API route sets `sync_status = 'pending'`
- A Next.js API route `/api/files/sync` is called (or a cron hits it)
- Processes all `pending` items in batches

**Recommended**: Option B with **Inngest** or **Trigger.dev** for reliable background jobs with retries.

---

## 3. Qdrant Collection Schema

### Collection: `file_chunks`

```json
{
  "vectors": {
    "size": 1536,
    "distance": "Cosine"
  }
}
```

### Point payload

```json
{
  "file_id": "uuid",
  "file_name": "document.pdf",
  "chunk_index": 0,
  "chunk_text": "The raw text content of this chunk...",
  "organization_id": "uuid",
  "owner_id": "uuid",
  "scope": "user",
  "root_folder_id": "uuid",
  "parent_id": "uuid",
  "mime_type": "application/pdf",
  "content_hash": "sha256...",
  "created_at": "2025-04-15T00:00:00Z"
}
```

### Why store all this metadata in Qdrant?

- **Filtering at query time**: search only within a user's files, a specific folder, or an org scope
- **Staleness detection**: compare `content_hash` in Qdrant with DB to know if re-index is needed
- **Display**: return file name and chunk text directly without a DB round-trip

---

## 4. Keeping Qdrant in Sync with Drive Actions

Every drive mutation must update sync state:

| Drive action | Effect on Qdrant |
|---|---|
| **File upload** | Set `sync_status = 'pending'` → triggers pipeline |
| **File replace/re-upload** | New hash → `pending` → pipeline deletes old points, indexes new ones |
| **File rename** | Update `file_name` in Qdrant payload (batch update by `file_id` filter) |
| **File move** | Update `parent_id` in Qdrant payload |
| **File delete** | Delete all points where `file_id = X` |
| **Folder delete** | Recursively collect all descendant file IDs → delete all their points |
| **File metadata update** | Update relevant payload fields in Qdrant |

### Implementation approach

Add a `SyncService` class with methods like:

```
syncService.onFileCreated(fileId)       → set pending, enqueue job
syncService.onFileUpdated(fileId)       → set pending, enqueue job
syncService.onFileRenamed(fileId, name) → update Qdrant payload
syncService.onFileMoved(fileId, newParentId) → update Qdrant payload
syncService.onFileDeleted(fileId)       → delete points from Qdrant
syncService.onFolderDeleted(folderId)   → recursive delete from Qdrant
```

Hook these into the existing `file.repository.ts` methods or as middleware in the API routes.

---

## 5. Frontend: Sync Status in the UI

### Type changes

```ts
// Add to FileItem type
syncStatus?: "pending" | "processing" | "synced" | "error" | "not_applicable";
syncError?: string;
syncedAt?: string;
chunkCount?: number;
```

### File list — per-item indicator

In `FileListRow` and `FileGridCard`, show a small icon next to the file name:

| Status | Icon | Color | Tooltip |
|---|---|---|---|
| `synced` | `CheckCircle2` or custom "brain" icon | green | "Indexed — searchable" |
| `processing` | `Loader2` (spinning) | blue | "Indexing..." |
| `pending` | `Clock` | muted | "Waiting to be indexed" |
| `error` | `AlertCircle` | red | "Indexing failed: {syncError}" |
| `not_applicable` | — (hidden) | — | — |

### Folder-level aggregate status

For folders, compute an aggregate from children:

```ts
function getFolderSyncStatus(folderId: string, files: Record<string, FileItem>): string {
  const children = getAllDescendantFiles(folderId, files);
  if (children.some(f => f.syncStatus === 'error')) return 'error';
  if (children.some(f => f.syncStatus === 'processing')) return 'processing';
  if (children.some(f => f.syncStatus === 'pending')) return 'pending';
  if (children.every(f => f.syncStatus === 'synced' || f.syncStatus === 'not_applicable')) return 'synced';
  return 'pending';
}
```

Show same icon on folders, with a tooltip like "3/5 files indexed".

### Details panel

In `FileDetailsPanel`, add a "Search Index" section:

- Status badge (synced / pending / error)
- Last synced timestamp
- Chunk count (e.g. "12 chunks indexed")
- "Re-index" button to force re-processing
- Error message if failed

### Storage / quota indicator

To show how much vector storage is used:

```sql
-- Add to organizations table or a new table
CREATE TABLE public.org_qdrant_usage (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id),
  total_chunks INTEGER DEFAULT 0,
  total_files_indexed INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);
```

Update this table after each sync job. Display in the sidebar footer (where `StorageIndicator` was):

```
📊 Vector Index: 1,234 chunks across 45 files
```

---

## 6. API Routes

| Route | Method | Purpose |
|---|---|---|
| `POST /api/files/sync` | POST | Trigger sync for pending files (called by cron or after upload) |
| `POST /api/files/:id/resync` | POST | Force re-index a specific file |
| `GET /api/files/sync/status` | GET | Get overall sync stats for the org |
| `POST /api/search` | POST | Semantic search: embed query → Qdrant search → return results |

---

## 7. Tech Stack Choices

| Component | Recommended | Alternative |
|---|---|---|
| **Embeddings** | OpenAI `text-embedding-3-small` (1536d, cheap) | `text-embedding-3-large`, Cohere |
| **Vector DB** | Qdrant (self-hosted or Qdrant Cloud) | — |
| **Text extraction** | `pdf-parse` + `mammoth` + `tesseract.js` | Unstructured.io API, LlamaParse |
| **OCR for images** | OpenAI Vision API (GPT-4o-mini) | Google Vision, Tesseract |
| **Background jobs** | Inngest / Trigger.dev | pg_cron + Edge Functions |
| **Chunking** | LangChain `RecursiveCharacterTextSplitter` | Custom sliding window |

---

## 8. Sequence Diagram

```
User uploads file.pdf
  │
  ├─ POST /api/files/upload
  │    ├─ Store in Supabase Storage
  │    ├─ Create file_items row (sync_status = 'pending')
  │    └─ Return FileItem to frontend
  │
  ├─ Frontend shows 🕐 "pending" icon
  │
  ├─ Background job picks up file
  │    ├─ Update sync_status = 'processing'
  │    ├─ Download from Storage
  │    ├─ Extract text (pdf-parse)
  │    ├─ Chunk into ~500 token segments
  │    ├─ Embed via OpenAI
  │    ├─ Upsert to Qdrant (with full payload metadata)
  │    ├─ Update sync_status = 'synced', synced_at, chunk_count
  │    └─ Update org_qdrant_usage
  │
  ├─ Frontend polls or receives realtime update → shows ✅ "synced"
  │
  └─ Later: User renames file
       ├─ PATCH /api/files/:id { name: "new.pdf" }
       ├─ Update file_items.name
       └─ syncService.onFileRenamed → batch update Qdrant payload
```

---

## 9. Realtime Sync Status Updates

To avoid polling, use **Supabase Realtime** to subscribe to `file_items` changes:

```ts
supabase
  .channel('file-sync')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'file_items',
    filter: `owner_id=eq.${userId}`,
  }, (payload) => {
    // Update store with new sync_status
    updateFileInStore(payload.new.id, { syncStatus: payload.new.sync_status });
  })
  .subscribe();
```

This way, when the background job updates `sync_status` from `processing` → `synced`, the UI updates instantly.

---

## 10. Migration Plan (Phased)

### Phase 1 — Schema + status tracking
- Add `sync_status`, `content_hash`, `chunk_count`, `synced_at` columns
- Update `FileItem` type and API responses
- Show sync status icons in UI (all files will show "pending" initially)

### Phase 2 — Extraction service
- Build `TextExtractor` with per-mime-type handlers
- Build `ChunkingService` (recursive text splitter)
- Test locally with PDF + image files

### Phase 3 — Qdrant integration
- Set up Qdrant collection
- Build `EmbeddingService` (OpenAI calls)
- Build `QdrantService` (upsert, delete, search, payload update)
- Build `SyncService` orchestrating the full pipeline

### Phase 4 — Background jobs
- Set up Inngest/Trigger.dev
- Wire upload + update hooks to enqueue sync jobs
- Add retry logic and error handling

### Phase 5 — Search
- `POST /api/search` endpoint
- Embed query → Qdrant search → return file results with highlights
- Frontend search UI (could integrate into existing search bar)

### Phase 6 — Realtime + polish
- Supabase Realtime subscription for sync status changes
- Folder aggregate indicators
- Re-index button
- Storage/usage dashboard
