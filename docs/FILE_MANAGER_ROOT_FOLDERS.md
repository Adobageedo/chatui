# File Manager — Root Folders & Storage Architecture

## Overview

The file manager supports **multi-scope root folders**: some are private to a user, others are shared across an organization. Each root folder maps to a separate storage bucket in Supabase Storage, providing clean data isolation.

---

## How Root Folders Work

### Registry Table: `root_folder_registry`

Every root folder type is defined as a row in `root_folder_registry`. This table is the **single source of truth** for what roots exist in the system.

| Column | Description |
|--------|-------------|
| `slug` | Unique key used in code (e.g. `drive`, `leases`) |
| `name` | Display name in the sidebar |
| `scope` | `user` = one instance per user, `org` = one shared instance per org |
| `locked` | If `true`, users cannot rename/delete/move the root or its locked children |
| `icon` | Lucide icon name hint for the frontend |
| `sort_order` | Controls sidebar ordering |

### Current Registry Entries

| Slug | Name | Scope | Locked | Description |
|------|------|-------|--------|-------------|
| `drive` | My Drive | `user` | No | Personal file storage, private to each user |
| `leases` | Leases | `org` | Yes | Shared lease documents, visible to all org members |

---

## Adding a New Root Folder

### Step 1: Insert into `root_folder_registry`

Create a new migration or run directly in Supabase SQL editor:

```sql
-- Example: Add a shared "Templates" root folder for the org
INSERT INTO public.root_folder_registry (slug, name, scope, locked, icon, sort_order)
VALUES ('templates', 'Templates', 'org', true, 'layout-template', 2);
```

```sql
-- Example: Add a private "Bookmarks" root folder per user
INSERT INTO public.root_folder_registry (slug, name, scope, locked, icon, sort_order)
VALUES ('bookmarks', 'Bookmarks', 'user', false, 'bookmark', 3);
```

### Step 2: Provisioning Happens Automatically

The `provision_user_root_folders()` DB function runs on every `GET /api/files` call. It:

1. Reads all entries from `root_folder_registry`
2. For **user-scope** roots: creates a root folder if one doesn't exist for that user
3. For **org-scope** roots: creates a root folder if one doesn't exist for that org

No code changes needed — new roots appear automatically on next page load.

### Step 3 (Optional): Add Locked Subfolders

If your new root needs pre-created locked subfolders (like Leases has "Active Leases", "Expired Leases", etc.), create a provisioning function similar to `provision_leases_subfolders()`:

```sql
CREATE OR REPLACE FUNCTION public.provision_templates_subfolders(
    p_root_id UUID,
    p_organization_id UUID,
    p_owner_id UUID
)
RETURNS VOID AS $$
DECLARE
    existing INT;
BEGIN
    SELECT COUNT(*) INTO existing FROM public.file_items WHERE parent_id = p_root_id;
    IF existing > 0 THEN RETURN; END IF;

    INSERT INTO public.file_items (name, type, parent_id, root_folder_id, root_registry_id, scope, organization_id, owner_id, locked)
    SELECT sub.name, 'folder', p_root_id, p_root_id, fi.root_registry_id, 'org', p_organization_id, p_owner_id, TRUE
    FROM (VALUES ('Contracts'), ('Reports'), ('Invoices')) AS sub(name)
    CROSS JOIN public.file_items fi WHERE fi.id = p_root_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

Then add a call in `GET /api/files/route.ts`:

```typescript
if (reg?.slug === "templates") {
  await fileRepository.provisionTemplatesSubfolders(root.id, orgId, auth.userId);
}
```

---

## Scope Behavior

### `user` scope
- **Visibility**: Only the owning user can see/edit these files
- **Storage bucket**: `user-files/{userId}/...`
- **RLS**: `owner_id = auth.uid()`
- **Use case**: Personal documents, drafts, bookmarks

### `org` scope
- **Visibility**: All members of the organization can see/edit
- **Storage bucket**: `org-files/{orgId}/...`
- **RLS**: `organization_id IN (SELECT organization_id FROM organization_users WHERE user_id = auth.uid())`
- **Use case**: Shared leases, templates, company documents

---

## Storage Buckets

Two Supabase Storage buckets must be created:

| Bucket | Purpose | Path Pattern |
|--------|---------|-------------|
| `user-files` | User-private files | `{userId}/{rootFolderId}/{timestamp}-{filename}` |
| `org-files` | Org-shared files | `{orgId}/{rootFolderId}/{timestamp}-{filename}` |

### Creating Buckets (Supabase Dashboard or CLI)

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('user-files', 'user-files', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('org-files', 'org-files', false);
```

### Storage RLS Policies

```sql
-- user-files: only the owner can access
CREATE POLICY "Users access own files"
ON storage.objects FOR ALL
USING (bucket_id = 'user-files' AND (storage.foldername(name))[1] = auth.uid()::text);

-- org-files: org members can access
CREATE POLICY "Org members access org files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'org-files' AND (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM public.organization_users WHERE user_id = auth.uid()
  )
);
```

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                   Frontend (Zustand Store)                │
│  fetchFiles() → GET /api/files → files + rootIds         │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────┐
│              API Routes (/api/files/*)                    │
│  Auth via AuthMiddleware.verifyAuth()                    │
│  Delegates to FileRepository + StorageService            │
└──────────┬──────────────────────────────┬────────────────┘
           │                              │
           ▼                              ▼
┌────────────────────┐       ┌────────────────────────────┐
│  FileRepository    │       │  StorageService            │
│  (Supabase DB)     │       │  (Supabase Storage)        │
│                    │       │                            │
│  file_items table  │       │  user-files bucket         │
│  root_folder_reg.  │       │  org-files bucket          │
└────────────────────┘       └────────────────────────────┘
```

---

## Deployment Checklist

1. **Run migration**: `supabase db push` or apply `004_file_manager.sql` manually
2. **Create storage buckets**: `user-files` and `org-files` (see above)
3. **Add storage RLS policies** (see above)
4. **Verify**: Log in → navigate to `/files` → root folders should auto-provision
