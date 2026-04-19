import { createClient } from "@/lib/supabase/server";
import type { FileItem, MetadataEntry, RootFolderRegistry, SyncStatus } from "@/lib/files/types";
import { storageService } from "./storage.service";

// ── DB row types (snake_case) ───────────────────────────────────────────────

interface FileItemRow {
  id: string;
  name: string;
  type: "file" | "folder";
  parent_id: string | null;
  root_folder_id: string;
  root_registry_id: string;
  scope: "user" | "org";
  organization_id: string;
  owner_id: string;
  size: number | null;
  mime_type: string | null;
  starred: boolean;
  shared: boolean;
  locked: boolean;
  storage_bucket: string | null;
  storage_path: string | null;
  metadata: MetadataEntry[];
  created_at: string;
  updated_at: string;
  // Sync fields (nullable until migration is applied)
  sync_status?: string | null;
  sync_error?: string | null;
  synced_at?: string | null;
  content_hash?: string | null;
  chunk_count?: number | null;
}

interface RootRegistryRow {
  id: string;
  slug: string;
  name: string;
  scope: "user" | "org";
  locked: boolean;
  icon: string;
  sort_order: number;
}

// ── Mappers ─────────────────────────────────────────────────────────────────

function mapRow(row: FileItemRow): FileItem {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    parentId: row.parent_id,
    size: row.size ?? undefined,
    mimeType: row.mime_type ?? undefined,
    createdAt: row.created_at,
    modifiedAt: row.updated_at,
    starred: row.starred,
    shared: row.shared,
    owner: row.owner_id,
    locked: row.locked,
    metadata: row.metadata ?? [],
    rootFolderId: row.root_folder_id,
    rootRegistryId: row.root_registry_id,
    scope: row.scope,
    organizationId: row.organization_id,
    ownerId: row.owner_id,
    storageBucket: row.storage_bucket ?? undefined,
    storagePath: row.storage_path ?? undefined,
    // Sync fields (populated by DB trigger on INSERT)
    syncStatus: (row.sync_status as SyncStatus) ?? "pending",
    syncError: row.sync_error ?? undefined,
    syncedAt: row.synced_at ?? undefined,
    contentHash: row.content_hash ?? undefined,
    chunkCount: row.chunk_count ?? 0,
  };
}

function mapRegistry(row: RootRegistryRow): RootFolderRegistry {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    scope: row.scope,
    locked: row.locked,
    icon: row.icon,
    sortOrder: row.sort_order,
  };
}

// ── Repository ──────────────────────────────────────────────────────────────

export class FileRepository {
  /**
   * Get user's organization ID (reuses pattern from ThreadRepository)
   */
  async getUserOrganizationId(userId: string): Promise<string> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("organization_users")
      .select("organization_id")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new Error("User organization not found");
    }
    return data.organization_id;
  }

  /**
   * Get root folder registry entries
   */
  async getRootRegistry(): Promise<RootFolderRegistry[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("root_folder_registry")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw new Error(`Failed to fetch root registry: ${error.message}`);
    return (data ?? []).map(mapRegistry);
  }

  /**
   * Provision root folders for a user (calls the DB function)
   */
  async provisionRootFolders(userId: string, organizationId: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("provision_user_root_folders", {
      p_user_id: userId,
      p_organization_id: organizationId,
    });
    if (error) throw new Error(`Failed to provision root folders: ${error.message}`);
  }

  /**
   * Provision default subfolders for org-scope roots (e.g. leases)
   */
  async provisionLeasesSubfolders(
    rootId: string,
    organizationId: string,
    ownerId: string
  ): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.rpc("provision_leases_subfolders", {
      p_root_id: rootId,
      p_organization_id: organizationId,
      p_owner_id: ownerId,
    });
    if (error) throw new Error(`Failed to provision leases subfolders: ${error.message}`);
  }

  /**
   * Get all root folders for a user (user-scope + org-scope)
   */
  async getRootFolders(userId: string, organizationId: string): Promise<FileItem[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("file_items")
      .select("*")
      .is("parent_id", null)
      .or(`and(scope.eq.user,owner_id.eq.${userId}),and(scope.eq.org,organization_id.eq.${organizationId})`)
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Failed to fetch root folders: ${error.message}`);
    return (data ?? []).map(mapRow);
  }

  /**
   * Get all descendant items under given root folder IDs (flat list)
   */
  async getAllItemsUnderRoots(rootFolderIds: string[]): Promise<FileItem[]> {
    if (rootFolderIds.length === 0) return [];

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("file_items")
      .select("*")
      .in("root_folder_id", rootFolderIds)
      .order("name", { ascending: true });

    if (error) throw new Error(`Failed to fetch file items: ${error.message}`);
    return (data ?? []).map(mapRow);
  }

  /**
   * Get a single file item by ID
   */
  async getItem(id: string): Promise<FileItem | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("file_items")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return mapRow(data);
  }

  /**
   * Get direct children of a folder
   */
  async getChildren(parentId: string): Promise<FileItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("file_items")
      .select("*")
      .eq("parent_id", parentId)
      .order("type", { ascending: true }) // folders first
      .order("name", { ascending: true });

    if (error) throw new Error(`Failed to fetch children: ${error.message}`);
    return (data ?? []).map(mapRow);
  }

  /**
   * Create a new file or folder
   */
  async createItem(params: {
    name: string;
    type: "file" | "folder";
    parentId: string;
    rootFolderId: string;
    rootRegistryId: string;
    scope: "user" | "org";
    organizationId: string;
    ownerId: string;
    size?: number;
    mimeType?: string;
    locked?: boolean;
    storageBucket?: string;
    storagePath?: string;
    metadata?: MetadataEntry[];
  }): Promise<FileItem> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("file_items")
      .insert({
        name: params.name,
        type: params.type,
        parent_id: params.parentId,
        root_folder_id: params.rootFolderId,
        root_registry_id: params.rootRegistryId,
        scope: params.scope,
        organization_id: params.organizationId,
        owner_id: params.ownerId,
        size: params.size ?? null,
        mime_type: params.mimeType ?? null,
        locked: params.locked ?? false,
        storage_bucket: params.storageBucket ?? null,
        storage_path: params.storagePath ?? null,
        metadata: params.metadata ?? [],
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create item: ${error.message}`);
    return mapRow(data);
  }

  /**
   * Update an item (partial update)
   */
  async updateItem(
    id: string,
    updates: Partial<{
      name: string;
      starred: boolean;
      shared: boolean;
      parent_id: string;
      metadata: MetadataEntry[];
      storage_bucket: string;
      storage_path: string;
      sync_status: string;
      sync_error: string | null;
      synced_at: string | null;
      content_hash: string | null;
      chunk_count: number;
    }>
  ): Promise<FileItem> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("file_items")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new Error(`Failed to update item: ${error.message}`);
    return mapRow(data);
  }

  /**
   * Delete an item (cascades to children via FK)
   */
  async deleteItem(id: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
      .from("file_items")
      .delete()
      .eq("id", id);

    if (error) throw new Error(`Failed to delete item: ${error.message}`);
  }

  /**
   * Move an item to a new parent
   */
  async moveItem(id: string, newParentId: string): Promise<FileItem> {
    return this.updateItem(id, { parent_id: newParentId });
  }

  /**
   * Duplicate an item (shallow copy, no children for folders)
   * @param targetParentId - Optional target parent folder. Defaults to original parent.
   */
  async duplicateItem(id: string, ownerId: string, targetParentId?: string): Promise<FileItem> {
    const original = await this.getItem(id);
    if (!original) throw new Error("Item not found");

    const parentId = targetParentId ?? original.parentId!;
    const isSameFolder = parentId === original.parentId;

    // Get parent to inherit root context
    const parent = await this.getItem(parentId);
    if (!parent) throw new Error("Target parent not found");

    // Get existing items in target folder to check for conflicts
    const siblings = await this.getChildren(parentId);
    const existingNames = new Set(siblings.map((s: FileItem) => s.name));

    // Smart naming: if copying to different folder, keep original name unless conflict
    let dupName = original.name;
    if (isSameFolder) {
      // Same folder: always add "(Copy)" suffix
      dupName =
        original.type === "folder"
          ? `${original.name} (Copy)`
          : original.name.replace(/(\.[^.]+)$/, " (Copy)$1");
    }

    // Handle conflicts with numbering
    if (existingNames.has(dupName)) {
      const baseName = original.type === "folder" ? original.name : original.name.replace(/(\.[^.]+)$/, "");
      const ext = original.type === "folder" ? "" : original.name.match(/(\.[^.]+)$/)?.[0] ?? "";
      let counter = 1;
      do {
        dupName = `${baseName} (${counter})${ext}`;
        counter++;
      } while (existingNames.has(dupName));
    }

    // Copy storage file if the original has one
    let storageBucket: string | undefined;
    let storagePath: string | undefined;

    if (original.type === "file" && original.storageBucket && original.storagePath) {
      const fromLocation = { bucket: original.storageBucket, path: original.storagePath };
      // Build destination path: replace old filename with new name in the same directory
      const pathParts = original.storagePath.split("/");
      pathParts[pathParts.length - 1] = dupName;
      const toLocation = { bucket: original.storageBucket, path: pathParts.join("/") };

      try {
        await storageService.copyFile(fromLocation, toLocation);
        storageBucket = toLocation.bucket;
        storagePath = toLocation.path;
      } catch {
        // Storage copy failed — still create DB record, download just won't work
      }
    }

    return this.createItem({
      name: dupName,
      type: original.type,
      parentId,
      rootFolderId: parent.rootFolderId!,
      rootRegistryId: parent.rootRegistryId!,
      scope: parent.scope!,
      organizationId: parent.organizationId!,
      ownerId,
      size: original.size,
      mimeType: original.mimeType,
      metadata: original.metadata,
      storageBucket,
      storagePath,
    });
  }
  // ── Sync helpers ──────────────────────────────────────────────────────────

  /**
   * Update sync status for a single item.
   * Used by the sync pipeline and the resync endpoint.
   */
  async updateSyncStatus(
    id: string,
    status: string,
    extra?: { syncError?: string | null; syncedAt?: string | null; contentHash?: string | null; chunkCount?: number }
  ): Promise<FileItem> {
    return this.updateItem(id, {
      sync_status: status,
      sync_error: extra?.syncError ?? null,
      synced_at: extra?.syncedAt ?? null,
      content_hash: extra?.contentHash ?? null,
      chunk_count: extra?.chunkCount ?? undefined,
    });
  }

  /**
   * Get all files with sync_status = 'pending' (for the pipeline to pick up).
   */
  async getPendingSyncItems(limit = 50): Promise<FileItem[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("file_items")
      .select("*")
      .eq("sync_status", "pending")
      .eq("type", "file")
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Failed to fetch pending sync items: ${error.message}`);
    return (data ?? []).map(mapRow);
  }

  /**
   * Get all descendant file IDs under a folder (recursive via DB).
   * Used for bulk sync operations (e.g. folder delete → remove from Qdrant).
   */
  async getDescendantFileIds(folderId: string): Promise<string[]> {
    const supabase = await createClient();
    // Use a recursive CTE via rpc, or fallback to fetching all items under the root
    // For now, use a simple recursive approach in JS
    const result: string[] = [];
    const queue = [folderId];
    while (queue.length > 0) {
      const parentId = queue.shift()!;
      const children = await this.getChildren(parentId);
      for (const child of children) {
        if (child.type === "file") {
          result.push(child.id);
        } else {
          queue.push(child.id);
        }
      }
    }
    return result;
  }
}

export const fileRepository = new FileRepository();
