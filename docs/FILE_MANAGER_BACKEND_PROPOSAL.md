# File Manager — Backend Deployment Proposal

## 1. Overview

The current file manager is a **fully client-side mock**. To make it production-ready, we need a backend that handles file storage, metadata persistence, sharing, permissions, and search. This document proposes the architecture, stack, and deployment strategy.

---

## 2. Recommended Stack

| Layer | Technology | Rationale |
|---|---|---|
| **API** | **Next.js API Routes** (existing) or **separate Node.js service** | Keeps the deployment simple if staying in the monorepo; a separate service is better for scale |
| **Runtime** | **Node.js 20+** with TypeScript | Already the project's runtime |
| **Database** | **Supabase PostgreSQL** (existing) | Already integrated for auth — reuse for file metadata, sharing, permissions |
| **Object Storage** | **Supabase Storage** (existing bucket `documents`) | Already configured; supports RLS policies, signed URLs, resumable uploads |
| **Search** | **PostgreSQL Full-Text Search** (`tsvector`) | No extra infra; good enough for file name + metadata search. Upgrade to **Typesense** or **Meilisearch** later if needed |
| **Real-time** | **Supabase Realtime** | Already available; push file changes to connected clients instantly |
| **Queue (optional)** | **Inngest** or **Trigger.dev** | For background jobs: thumbnail generation, virus scanning, large file processing |

---

## 3. Database Schema

```sql
-- File/folder metadata
CREATE TABLE file_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('file', 'folder')),
  parent_id     UUID REFERENCES file_items(id) ON DELETE CASCADE,
  owner_id      UUID NOT NULL REFERENCES auth.users(id),
  mime_type     TEXT,
  size_bytes    BIGINT DEFAULT 0,
  storage_path  TEXT,                    -- path in Supabase Storage
  starred       BOOLEAN DEFAULT FALSE,
  trashed       BOOLEAN DEFAULT FALSE,
  trashed_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),

  -- Full-text search
  search_vector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', name)) STORED
);

CREATE INDEX idx_file_items_parent ON file_items(parent_id);
CREATE INDEX idx_file_items_owner  ON file_items(owner_id);
CREATE INDEX idx_file_items_search ON file_items USING GIN(search_vector);

-- Sharing / permissions
CREATE TABLE file_shares (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id       UUID NOT NULL REFERENCES file_items(id) ON DELETE CASCADE,
  shared_with   UUID REFERENCES auth.users(id),  -- NULL = public link
  permission    TEXT NOT NULL CHECK (permission IN ('viewer', 'editor', 'owner')),
  link_token    TEXT UNIQUE,                       -- for public share links
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_file_shares_file ON file_shares(file_id);
CREATE INDEX idx_file_shares_user ON file_shares(shared_with);

-- Activity log
CREATE TABLE file_activity (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id       UUID NOT NULL REFERENCES file_items(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  action        TEXT NOT NULL, -- 'created', 'renamed', 'moved', 'deleted', 'shared', 'downloaded'
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_file_activity_file ON file_activity(file_id);
```

---

## 4. API Design

### Option A: Next.js API Routes (recommended for MVP)

Keep everything in the existing repo under `app/api/files/`:

```
app/api/files/
├── route.ts              GET (list), POST (create folder)
├── [id]/
│   ├── route.ts          GET (metadata), PATCH (rename/move/star), DELETE
│   └── download/route.ts GET (signed URL)
├── upload/route.ts       POST (multipart upload → Supabase Storage)
├── search/route.ts       GET ?q=...
├── share/route.ts        POST (create share), DELETE (revoke)
└── trash/
    ├── route.ts          GET (list trashed), DELETE (empty trash)
    └── [id]/route.ts     POST (restore)
```

### Option B: Separate Microservice (for scale)

A standalone **Hono** or **Express** service deployed to **Railway** / **Fly.io** / **Render**, talking to the same Supabase instance. Use this if the file manager becomes a core product feature with heavy traffic.

---

## 5. Supabase Storage Integration

```typescript
// Example: upload file
import { createClient } from "@/lib/supabase/server";

export async function uploadFile(file: File, parentId: string, userId: string) {
  const supabase = await createClient();
  const storagePath = `${userId}/${parentId}/${Date.now()}-${file.name}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(storagePath, file, { upsert: false });

  if (uploadError) throw uploadError;

  // Create metadata row
  const { data, error } = await supabase
    .from("file_items")
    .insert({
      name: file.name,
      type: "file",
      parent_id: parentId,
      owner_id: userId,
      mime_type: file.type,
      size_bytes: file.size,
      storage_path: storagePath,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### RLS Policies

```sql
-- Users can only see their own files + files shared with them
CREATE POLICY "Users see own files" ON file_items
  FOR SELECT USING (
    owner_id = auth.uid()
    OR id IN (SELECT file_id FROM file_shares WHERE shared_with = auth.uid())
  );

CREATE POLICY "Users manage own files" ON file_items
  FOR ALL USING (owner_id = auth.uid());
```

---

## 6. Deployment Strategy

### Phase 1 — MVP (1-2 weeks)

1. **Create Supabase migration** for the schema above
2. **Implement API routes** in `app/api/files/` (CRUD + upload + download)
3. **Replace mock store** — swap `MOCK_FILES` with API calls using a data-fetching layer (React Query or SWR)
4. **Wire upload** — connect the "Upload file" button to the real API
5. **Deploy** — same Vercel deployment, zero new infra

### Phase 2 — Production Hardening (2-4 weeks)

- **Resumable uploads** via Supabase `tus` protocol for large files
- **Thumbnails** — generate on upload via Edge Function or background job
- **Trash / soft delete** with 30-day auto-purge (pg_cron)
- **Activity log** UI
- **Sharing** UI with link generation + permission management
- **Quota enforcement** — check storage limits before upload

### Phase 3 — Scale (optional)

- Separate file service on **Railway** or **Fly.io**
- **Meilisearch** for full-text + fuzzy file search
- **CDN** (Cloudflare R2 or S3 + CloudFront) for file delivery
- **Virus scanning** via ClamAV sidecar or cloud API
- **Versioning** — store file versions with rollback

---

## 7. Repo Structure Proposal

```
chatui/
├── app/
│   ├── api/files/          ← NEW: API routes
│   │   ├── route.ts
│   │   ├── [id]/route.ts
│   │   ├── upload/route.ts
│   │   ├── search/route.ts
│   │   └── share/route.ts
│   └── files/              ← EXISTING: UI (already built)
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       ├── file-manager.tsx
│       └── page.tsx
├── lib/
│   └── files/              ← NEW: shared logic
│       ├── files.service.ts     (API client)
│       ├── files.queries.ts     (React Query hooks)
│       └── files.types.ts       (shared types)
├── supabase/
│   └── migrations/
│       └── 20250412_file_manager.sql  ← NEW
└── docs/
    └── FILE_MANAGER_BACKEND_PROPOSAL.md  ← THIS FILE
```

---

## 8. Migration from Mock to Real

The Zustand store actions already mirror what the API will do. The migration path:

1. Create `lib/files/files.service.ts` — thin API client wrapping `fetch`
2. Create `lib/files/files.queries.ts` — React Query hooks (`useFiles`, `useFileTree`, etc.)
3. Update each store action to call the API, then optimistically update local state
4. Remove `mock-data.ts` once all endpoints are wired

This keeps the UI **unchanged** — only the data layer swaps out.

---

## 9. Cost Estimate (Supabase Pro)

| Resource | Included (Pro $25/mo) | Notes |
|---|---|---|
| Database | 8 GB | More than enough for metadata |
| Storage | 100 GB | File uploads |
| Bandwidth | 250 GB | Downloads |
| Realtime | 500 concurrent | Live collaboration |
| Edge Functions | 2M invocations | Thumbnails, webhooks |

For most teams this is **$25/month total** with no additional services needed.

---

## 10. Summary

- **No new infra needed** — leverage existing Supabase + Vercel
- **MVP in 1-2 weeks** — API routes + Supabase Storage + swap mock data
- **The UI is already built** — only the data layer needs to change
- **Scales cleanly** — can extract to a separate service later if needed
