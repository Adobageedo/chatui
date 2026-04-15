export type FileItemType = "file" | "folder";
export type FileScope = "user" | "org";

/** Generic key-value metadata entry attached to any file or folder.
 *  Works across all domains (leases, HSQE, reporting, etc.). */
export type MetadataEntry = {
  /** Display label, e.g. "Tenant", "Property", "Status" */
  name: string;
  /** The value, always stored as string */
  value: string;
  /** Optional rendering hint: "text" (default), "date", "badge", "link", "currency" */
  type?: "text" | "date" | "badge" | "link" | "currency";
  /** Optional grouping key so UI can section metadata, e.g. "lease", "contact" */
  group?: string;
};

/** Root folder registry entry — defines a root folder type in the system */
export type RootFolderRegistry = {
  id: string;
  slug: string;
  name: string;
  scope: FileScope;
  locked: boolean;
  icon: string;
  sortOrder: number;
};

export type FileItem = {
  id: string;
  name: string;
  type: FileItemType;
  parentId: string | null;
  size?: number;
  mimeType?: string;
  createdAt: string;
  modifiedAt: string;
  starred: boolean;
  shared: boolean;
  owner: string;
  children?: string[];
  /** When true, the item's structure is locked: it cannot be renamed, deleted, or moved.
   *  Users can still add files *inside* locked folders, but cannot alter the folder itself. */
  locked?: boolean;
  /** Generic metadata entries — domain-agnostic key-value pairs */
  metadata?: MetadataEntry[];

  // ── DB-specific fields (populated by backend, optional on frontend) ──
  /** The root folder this item belongs to (self-referencing for root items) */
  rootFolderId?: string;
  /** Reference to root_folder_registry.id */
  rootRegistryId?: string;
  /** 'user' = private, 'org' = shared across organization */
  scope?: FileScope;
  /** Organization this item belongs to */
  organizationId?: string;
  /** User who owns this item */
  ownerId?: string;
  /** Supabase storage bucket name */
  storageBucket?: string;
  /** Path within the storage bucket */
  storagePath?: string;
};

export type SortField = "name" | "modifiedAt" | "size" | "type";
export type SortDirection = "asc" | "desc";
export type ViewMode = "grid" | "list";

export type BreadcrumbItem = {
  id: string | null;
  name: string;
};

export type ClipboardAction = "copy" | "cut";
export type ClipboardState = {
  itemIds: string[];
  action: ClipboardAction;
} | null;
