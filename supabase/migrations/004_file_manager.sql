-- ============================================================================
-- File Manager System
-- Multi-scope file storage with org-level and user-level root folders
-- ============================================================================

-- ============================================================================
-- ROOT FOLDER REGISTRY
-- Defines which root folders exist and their access scope.
-- To add a new root folder, INSERT into this table.
-- ============================================================================

CREATE TABLE public.root_folder_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Unique slug used in code (e.g. 'drive', 'leases')
    slug TEXT NOT NULL UNIQUE,

    -- Display name shown in the sidebar
    name TEXT NOT NULL,

    -- 'user' = one instance per user, 'org' = one shared instance per org
    scope TEXT NOT NULL CHECK (scope IN ('user', 'org')),

    -- If true, the macro folder structure is locked (users can't rename/delete/move)
    locked BOOLEAN NOT NULL DEFAULT FALSE,

    -- Icon name hint for the frontend (lucide icon name)
    icon TEXT DEFAULT 'folder',

    -- Ordering in the sidebar
    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.root_folder_registry IS 'Registry of root folder types. Each row defines a root folder that gets instantiated per-user or per-org.';
COMMENT ON COLUMN public.root_folder_registry.scope IS 'user = private per user, org = shared across the organization';

-- ============================================================================
-- FILE ITEMS
-- Hierarchical file/folder tree with multi-scope support.
-- ============================================================================

CREATE TABLE public.file_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tree structure
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('file', 'folder')),
    parent_id UUID REFERENCES public.file_items(id) ON DELETE CASCADE,

    -- Scope resolution
    root_folder_id UUID NOT NULL REFERENCES public.file_items(id) ON DELETE CASCADE,
    root_registry_id UUID NOT NULL REFERENCES public.root_folder_registry(id),
    scope TEXT NOT NULL CHECK (scope IN ('user', 'org')),

    -- Ownership
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- File metadata
    size BIGINT,
    mime_type TEXT,
    starred BOOLEAN NOT NULL DEFAULT FALSE,
    shared BOOLEAN NOT NULL DEFAULT FALSE,
    locked BOOLEAN NOT NULL DEFAULT FALSE,

    -- Storage location (for files only)
    storage_bucket TEXT,
    storage_path TEXT,

    -- Generic key-value metadata (JSONB array of {name, value, type?, group?})
    metadata JSONB DEFAULT '[]'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Special case: root folders have parent_id = NULL and root_folder_id = self
-- We need to allow self-referencing root_folder_id, so we defer the FK check
-- Actually, root_folder_id for a root item points to itself. We handle this
-- by inserting with a known UUID.

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX idx_file_items_parent_id ON public.file_items(parent_id);
CREATE INDEX idx_file_items_root_folder_id ON public.file_items(root_folder_id);
CREATE INDEX idx_file_items_owner_id ON public.file_items(owner_id);
CREATE INDEX idx_file_items_organization_id ON public.file_items(organization_id);
CREATE INDEX idx_file_items_scope ON public.file_items(scope);
CREATE INDEX idx_file_items_type ON public.file_items(type);
CREATE INDEX idx_file_items_starred ON public.file_items(owner_id, starred) WHERE starred = TRUE;
CREATE INDEX idx_file_items_storage ON public.file_items(storage_bucket, storage_path);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER update_file_items_updated_at
    BEFORE UPDATE ON public.file_items
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.root_folder_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_items ENABLE ROW LEVEL SECURITY;

-- Root folder registry: readable by all authenticated users
CREATE POLICY "Authenticated users can read root folder registry"
    ON public.root_folder_registry
    FOR SELECT
    TO authenticated
    USING (TRUE);

-- File items: user-scope items visible only to the owner
CREATE POLICY "Users can view their own user-scope files"
    ON public.file_items
    FOR SELECT
    USING (
        scope = 'user' AND owner_id = auth.uid()
    );

-- File items: org-scope items visible to all org members
CREATE POLICY "Org members can view org-scope files"
    ON public.file_items
    FOR SELECT
    USING (
        scope = 'org' AND organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid()
        )
    );

-- INSERT: users can create files in their own scope
CREATE POLICY "Users can create user-scope files"
    ON public.file_items
    FOR INSERT
    WITH CHECK (
        scope = 'user' AND owner_id = auth.uid()
    );

-- INSERT: org members can create files in org scope
CREATE POLICY "Org members can create org-scope files"
    ON public.file_items
    FOR INSERT
    WITH CHECK (
        scope = 'org' AND organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid()
        )
    );

-- UPDATE: user-scope files can be updated by the owner
CREATE POLICY "Users can update their own user-scope files"
    ON public.file_items
    FOR UPDATE
    USING (scope = 'user' AND owner_id = auth.uid())
    WITH CHECK (scope = 'user' AND owner_id = auth.uid());

-- UPDATE: org-scope files can be updated by org members
CREATE POLICY "Org members can update org-scope files"
    ON public.file_items
    FOR UPDATE
    USING (
        scope = 'org' AND organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        scope = 'org' AND organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid()
        )
    );

-- DELETE: user-scope files can be deleted by the owner
CREATE POLICY "Users can delete their own user-scope files"
    ON public.file_items
    FOR DELETE
    USING (scope = 'user' AND owner_id = auth.uid());

-- DELETE: org-scope files can be deleted by org members
CREATE POLICY "Org members can delete org-scope files"
    ON public.file_items
    FOR DELETE
    USING (
        scope = 'org' AND organization_id IN (
            SELECT organization_id
            FROM public.organization_users
            WHERE user_id = auth.uid()
        )
    );

-- ============================================================================
-- GRANTS
-- ============================================================================

GRANT SELECT ON public.root_folder_registry TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.file_items TO authenticated;

-- ============================================================================
-- SEED: Root Folder Registry
-- Add new root folders here. Each row creates one root per user or per org.
-- ============================================================================

INSERT INTO public.root_folder_registry (slug, name, scope, locked, icon, sort_order) VALUES
    ('drive',  'My Drive', 'user', FALSE, 'hard-drive', 0),
    ('leases', 'Leases',   'org',  TRUE,  'file-text',  1);

-- ============================================================================
-- FUNCTION: Provision root folders for a user
-- Called on first access or user creation to ensure root folder instances exist.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.provision_user_root_folders(
    p_user_id UUID,
    p_organization_id UUID
)
RETURNS VOID AS $$
DECLARE
    reg RECORD;
    root_id UUID;
BEGIN
    FOR reg IN SELECT * FROM public.root_folder_registry ORDER BY sort_order LOOP
        IF reg.scope = 'user' THEN
            -- Check if user already has this root
            SELECT id INTO root_id
            FROM public.file_items
            WHERE owner_id = p_user_id
              AND root_registry_id = reg.id
              AND parent_id IS NULL;

            IF root_id IS NULL THEN
                root_id := gen_random_uuid();
                INSERT INTO public.file_items (
                    id, name, type, parent_id, root_folder_id,
                    root_registry_id, scope, organization_id, owner_id, locked
                ) VALUES (
                    root_id, reg.name, 'folder', NULL, root_id,
                    reg.id, 'user', p_organization_id, p_user_id, reg.locked
                );
            END IF;

        ELSIF reg.scope = 'org' THEN
            -- Check if org already has this root
            SELECT id INTO root_id
            FROM public.file_items
            WHERE organization_id = p_organization_id
              AND root_registry_id = reg.id
              AND parent_id IS NULL;

            IF root_id IS NULL THEN
                root_id := gen_random_uuid();
                INSERT INTO public.file_items (
                    id, name, type, parent_id, root_folder_id,
                    root_registry_id, scope, organization_id, owner_id, locked
                ) VALUES (
                    root_id, reg.name, 'folder', NULL, root_id,
                    reg.id, 'org', p_organization_id, p_user_id, reg.locked
                );
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Provision default locked subfolders for org roots
-- Called after provisioning to create the locked structure for leases etc.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.provision_leases_subfolders(
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
    SELECT
        sub.name, 'folder', p_root_id, p_root_id, fi.root_registry_id, 'org', p_organization_id, p_owner_id, TRUE
    FROM (VALUES
        ('Active Leases'),
        ('Expired Leases'),
        ('Templates'),
        ('Archive')
    ) AS sub(name)
    CROSS JOIN public.file_items fi
    WHERE fi.id = p_root_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STORAGE BUCKETS (run via Supabase dashboard or supabase CLI)
-- ============================================================================
-- These are informational. Execute in Supabase dashboard:
--
--   INSERT INTO storage.buckets (id, name, public) VALUES ('user-files', 'user-files', false);
--   INSERT INTO storage.buckets (id, name, public) VALUES ('org-files', 'org-files', false);
--
-- Storage RLS policies:
--   user-files: path must start with {userId}/
--   org-files:  path must start with {orgId}/
-- ============================================================================

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.file_items IS 'Hierarchical file/folder tree supporting user-private and org-shared scopes';
COMMENT ON COLUMN public.file_items.root_folder_id IS 'Points to the root file_item this belongs to (self-referencing for roots)';
COMMENT ON COLUMN public.file_items.root_registry_id IS 'References the root_folder_registry entry that defines this root type';
COMMENT ON COLUMN public.file_items.scope IS 'user = private to owner, org = shared across organization';
COMMENT ON COLUMN public.file_items.storage_bucket IS 'Supabase storage bucket name for files';
COMMENT ON COLUMN public.file_items.storage_path IS 'Path within the storage bucket';
COMMENT ON COLUMN public.file_items.metadata IS 'Generic JSONB metadata array [{name, value, type?, group?}]';
COMMENT ON FUNCTION public.provision_user_root_folders IS 'Creates root folder instances for a user. Call on first login or user creation.';
