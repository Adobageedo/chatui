import { create } from "zustand";
import { FileItem, SortField, SortDirection, ViewMode, BreadcrumbItem, ClipboardState } from "./types";
import * as api from "./api-client";
import { toast } from "sonner";
import { useUploadProgress } from "../../hooks/files/use-upload-progress";

// ── Types ────────────────────────────────────────────────────────────────────

interface FileManagerState {
  files: Record<string, FileItem>;
  rootIds: string[];
  currentFolderId: string;
  selectedIds: Set<string>;
  viewMode: ViewMode;
  sortField: SortField;
  sortDirection: SortDirection;
  searchQuery: string;
  renamingId: string | null;
  clipboard: ClipboardState;
  detailsPanelOpen: boolean;
  detailsItemId: string | null;
  dragOverFolderId: string | null;
  draggingIds: string[];
  expandedFolderIds: Set<string>;
  loading: boolean;

  // Data fetching
  fetchFiles: (silent?: boolean) => Promise<void>;

  // Navigation & selection
  navigateTo: (folderId: string) => void;
  toggleSelect: (id: string, multi?: boolean) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // View
  setViewMode: (mode: ViewMode) => void;
  setSort: (field: SortField) => void;
  setSearchQuery: (query: string) => void;

  // CRUD — optimistic + API call
  startRename: (id: string) => void;
  confirmRename: (newName: string) => void;
  cancelRename: () => void;
  createFolder: (name: string) => void;
  deleteSelected: () => void;
  toggleStar: (id: string) => void;
  copyToClipboard: (action: "copy" | "cut") => void;
  paste: () => void;
  moveItem: (itemId: string, targetFolderId: string) => void;
  moveItems: (itemIds: string[], targetFolderId: string) => void;
  duplicateSelected: () => void;

  // UI
  toggleDetailsPanel: (itemId?: string) => void;
  setDragOverFolder: (folderId: string | null) => void;
  startDrag: (ids: string[]) => void;
  endDrag: () => void;
  toggleExpandFolder: (folderId: string) => void;
  canDropInto: (targetFolderId: string) => boolean;

  // Derived
  getBreadcrumbs: () => BreadcrumbItem[];
  getCurrentChildren: () => FileItem[];
  isItemLocked: (id: string) => boolean;
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useFileManagerStore = create<FileManagerState>((set, get) => ({
  files: {},
  rootIds: [],
  currentFolderId: "root",
  selectedIds: new Set(),
  viewMode: "list",
  sortField: "name",
  sortDirection: "asc",
  searchQuery: "",
  renamingId: null,
  clipboard: null,
  detailsPanelOpen: false,
  detailsItemId: null,
  dragOverFolderId: null,
  draggingIds: [],
  expandedFolderIds: new Set(["root", "root-leases"]),
  loading: true,

  // ── Data fetching ────────────────────────────────────────────────────────

  fetchFiles: async (silent = false) => {
    if (!silent) {
      set({ loading: true });
    }
    try {
      const { files, rootIds } = await api.fetchAllFiles();
      set({ files, rootIds, loading: false });
    } catch (err) {
      if (!silent) {
        toast.error("Failed to load files");
      }
      console.error(err);
      set({ loading: false });
    }
  },

  // ── Navigation & selection ───────────────────────────────────────────────

  navigateTo: (folderId) =>
    set({ currentFolderId: folderId, selectedIds: new Set(), searchQuery: "" }),

  toggleSelect: (id, multi = false) =>
    set((state) => {
      const next = new Set(multi ? state.selectedIds : []);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { selectedIds: next };
    }),

  selectAll: () =>
    set((state) => {
      const folder = state.files[state.currentFolderId];
      if (!folder?.children) return {};
      return { selectedIds: new Set(folder.children) };
    }),

  clearSelection: () => set({ selectedIds: new Set() }),

  // ── View ─────────────────────────────────────────────────────────────────

  setViewMode: (mode) => set({ viewMode: mode }),

  setSort: (field) =>
    set((state) => ({
      sortField: field,
      sortDirection:
        state.sortField === field && state.sortDirection === "asc"
          ? "desc"
          : "asc",
    })),

  setSearchQuery: (query) => set({ searchQuery: query }),

  // ── Rename (optimistic + API) ────────────────────────────────────────────

  startRename: (id) => {
    const item = get().files[id];
    if (item?.locked) return;
    set({ renamingId: id });
  },

  confirmRename: (newName) => {
    const state = get();
    if (!state.renamingId) return;
    const item = state.files[state.renamingId];
    if (!item || !newName.trim() || item.locked) {
      set({ renamingId: null });
      return;
    }
    const id = state.renamingId;
    const oldName = item.name;

    // Optimistic update
    set({
      files: {
        ...state.files,
        [id]: { ...item, name: newName.trim(), modifiedAt: new Date().toISOString() },
      },
      renamingId: null,
    });

    // API call
    api.renameItem(id, newName.trim()).then((updated) => {
      set((s) => ({ files: { ...s.files, [id]: updated } }));
      toast.success(`Renamed to "${newName.trim()}"`);
    }).catch(() => {
      // Rollback
      set((s) => ({
        files: { ...s.files, [id]: { ...s.files[id], name: oldName } },
      }));
      toast.error("Failed to rename");
    });
  },

  cancelRename: () => set({ renamingId: null }),

  // ── Create folder (optimistic + API) ─────────────────────────────────────

  createFolder: (name) => {
    const state = get();
    const tempId = `folder-temp-${Date.now()}`;
    const now = new Date().toISOString();
    const parentFolder = state.files[state.currentFolderId];

    // Optimistic
    set({
      files: {
        ...state.files,
        [tempId]: {
          id: tempId,
          name,
          type: "folder",
          parentId: state.currentFolderId,
          createdAt: now,
          modifiedAt: now,
          starred: false,
          shared: false,
          owner: "Me",
          children: [],
        },
        [state.currentFolderId]: {
          ...parentFolder,
          children: [...(parentFolder.children || []), tempId],
        },
      },
    });

    api.createFolder(name, state.currentFolderId).then((created) => {
      set((s) => {
        const newFiles = { ...s.files };
        // Replace temp with real
        delete newFiles[tempId];
        newFiles[created.id] = created;
        // Update parent children
        const parent = newFiles[state.currentFolderId];
        if (parent) {
          newFiles[state.currentFolderId] = {
            ...parent,
            children: parent.children?.map((c) => (c === tempId ? created.id : c)),
          };
        }
        return { files: newFiles };
      });
      toast.success(`Folder "${name}" created`);
    }).catch(() => {
      // Rollback
      set((s) => {
        const newFiles = { ...s.files };
        delete newFiles[tempId];
        const parent = newFiles[state.currentFolderId];
        if (parent) {
          newFiles[state.currentFolderId] = {
            ...parent,
            children: parent.children?.filter((c) => c !== tempId),
          };
        }
        return { files: newFiles };
      });
      toast.error("Failed to create folder");
    });
  },

  // ── Delete (optimistic + API) ────────────────────────────────────────────

  deleteSelected: () => {
    const state = get();
    const unlocked = Array.from(state.selectedIds).filter(
      (id) => !state.files[id]?.locked
    );
    if (unlocked.length === 0) return;

    // Snapshot for rollback
    const snapshot = { ...state.files };

    // Optimistic: remove items
    const newFiles = { ...state.files };
    const toDelete = new Set(unlocked);
    const collectChildren = (id: string) => {
      const item = newFiles[id];
      if (item?.children) {
        item.children.forEach((childId) => {
          toDelete.add(childId);
          collectChildren(childId);
        });
      }
    };
    unlocked.forEach((id) => collectChildren(id));
    unlocked.forEach((id) => {
      const item = newFiles[id];
      if (item?.parentId && newFiles[item.parentId]) {
        newFiles[item.parentId] = {
          ...newFiles[item.parentId],
          children: newFiles[item.parentId].children?.filter((c) => c !== id),
        };
      }
    });
    toDelete.forEach((id) => delete newFiles[id]);
    set({ files: newFiles, selectedIds: new Set() });

    // API
    api.deleteItems(unlocked).then(() => {
      toast.success(`${unlocked.length} item(s) deleted`);
    }).catch(() => {
      set({ files: snapshot });
      toast.error("Failed to delete");
    });
  },

  // ── Star (optimistic + API) ──────────────────────────────────────────────

  toggleStar: (id) => {
    const state = get();
    const item = state.files[id];
    if (!item) return;

    // Optimistic
    set({
      files: {
        ...state.files,
        [id]: { ...item, starred: !item.starred },
      },
    });

    api.toggleStar(id).then((updated) => {
      set((s) => ({ files: { ...s.files, [id]: updated } }));
    }).catch(() => {
      // Rollback
      set((s) => ({
        files: { ...s.files, [id]: { ...s.files[id], starred: item.starred } },
      }));
      toast.error("Failed to toggle star");
    });
  },

  // ── Clipboard ────────────────────────────────────────────────────────────

  copyToClipboard: (action) => {
    const state = get();
    if (action === "cut") {
      const hasLocked = Array.from(state.selectedIds).some(
        (id) => state.files[id]?.locked
      );
      if (hasLocked) {
        toast.error("Cannot cut locked items");
        return;
      }
    }
    set({ clipboard: { itemIds: Array.from(state.selectedIds), action } });
    toast.info(
      `${state.selectedIds.size} item(s) ${action === "cut" ? "cut" : "copied"} to clipboard`
    );
  },

  paste: () => {
    const state = get();
    if (!state.clipboard) return;
    const { itemIds, action } = state.clipboard;

    if (action === "cut") {
      // Move each item via API
      const promises = itemIds.map((id) =>
        api.moveItem(id, state.currentFolderId)
      );
      // Optimistic move
      const newFiles = { ...state.files };
      itemIds.forEach((id) => {
        const item = newFiles[id];
        if (!item) return;
        if (item.parentId && newFiles[item.parentId]) {
          newFiles[item.parentId] = {
            ...newFiles[item.parentId],
            children: newFiles[item.parentId].children?.filter((c) => c !== id),
          };
        }
        const target = newFiles[state.currentFolderId];
        newFiles[state.currentFolderId] = {
          ...target,
          children: [...(target.children || []), id],
        };
        newFiles[id] = { ...item, parentId: state.currentFolderId };
      });
      set({ files: newFiles, clipboard: null });

      Promise.all(promises).then(() => {
        toast.success(`${itemIds.length} item(s) moved`);
        get().fetchFiles(true);
      }).catch(() => {
        toast.error("Failed to move items");
        get().fetchFiles(true);
      });
    } else {
      // Copy: duplicate each via API to the current folder
      const promises = itemIds.map((id) => api.duplicateItem(id, state.currentFolderId));
      set({ clipboard: null }); // Clear clipboard immediately after pasting
      Promise.all(promises).then((items) => {
        // Apply server response
        const newFiles = { ...get().files };
        items.forEach((newItem) => {
          newFiles[newItem.id] = newItem;
          if (newItem.parentId && newFiles[newItem.parentId]) {
            // Parent children already updated server-side; refresh
          }
        });
        get().fetchFiles(true);
        toast.success(`${itemIds.length} item(s) duplicated`);
      }).catch(() => {
        toast.error("Failed to paste items");
      });
    }
  },

  // ── Move (optimistic + API) ──────────────────────────────────────────────

  moveItem: (itemId, targetFolderId) => {
    get().moveItems([itemId], targetFolderId);
  },

  moveItems: (itemIds, targetFolderId) => {
    const state = get();
    const { addItem, updateItem, removeItem } = useUploadProgress.getState();

    // Filter out invalid items
    const validIds = itemIds.filter((id) => {
      const item = state.files[id];
      if (!item || id === targetFolderId || item.locked) return false;
      // Prevent moving a folder into itself or its descendants
      if (item.type === "folder") {
        let checkId: string | null = targetFolderId;
        while (checkId) {
          if (checkId === id) return false;
          checkId = state.files[checkId]?.parentId ?? null;
        }
      }
      // Skip if already in target
      if (item.parentId === targetFolderId) return false;
      return true;
    });

    if (validIds.length === 0) return;

    const snapshot = { ...state.files };
    const names = validIds.map((id) => state.files[id]?.name).filter(Boolean);

    // Add progress items
    const progressIds: string[] = [];
    for (const id of validIds) {
      const item = state.files[id];
      if (!item) continue;
      const progressId = `move-${id}-${Date.now()}`;
      progressIds.push(progressId);
      addItem({ id: progressId, name: item.name, type: "move", status: "uploading" });
    }

    // Optimistic
    const newFiles = { ...state.files };
    for (const id of validIds) {
      const item = newFiles[id];
      if (!item) continue;
      // Remove from old parent
      if (item.parentId && newFiles[item.parentId]) {
        newFiles[item.parentId] = {
          ...newFiles[item.parentId],
          children: newFiles[item.parentId].children?.filter((c) => c !== id),
        };
      }
      // Add to new parent
      const target = newFiles[targetFolderId];
      newFiles[targetFolderId] = {
        ...target,
        children: [...(target.children || []), id],
      };
      newFiles[id] = { ...item, parentId: targetFolderId };
    }
    set({ files: newFiles, selectedIds: new Set(), dragOverFolderId: null, draggingIds: [] });

    // API calls
    Promise.all(validIds.map((id) => api.moveItem(id, targetFolderId)))
      .then(() => {
        // Mark all as complete
        for (const progressId of progressIds) {
          updateItem(progressId, { status: "complete" });
          // Remove after a short delay
          setTimeout(() => removeItem(progressId), 2000);
        }
        if (names.length === 1) {
          toast.success(`"${names[0]}" moved`);
        } else {
          toast.success(`${names.length} items moved`);
        }
      })
      .catch(() => {
        // Mark all as error
        for (const progressId of progressIds) {
          updateItem(progressId, { status: "error", error: "Failed to move" });
        }
        set({ files: snapshot });
        toast.error(validIds.length === 1 ? "Failed to move item" : "Failed to move items");
      });
  },

  // ── Duplicate (API) ──────────────────────────────────────────────────────

  duplicateSelected: () => {
    const state = get();
    const unlocked = Array.from(state.selectedIds).filter(
      (id) => !state.files[id]?.locked
    );
    if (unlocked.length === 0) return;

    const promises = unlocked.map((id) => api.duplicateItem(id));
    Promise.all(promises).then(() => {
      get().fetchFiles(true);
      toast.success(`${unlocked.length} item(s) duplicated`);
    }).catch(() => {
      toast.error("Failed to duplicate");
    });

    set({ selectedIds: new Set() });
  },

  // ── UI ───────────────────────────────────────────────────────────────────

  toggleDetailsPanel: (itemId) =>
    set((state) => ({
      detailsPanelOpen: itemId ? true : !state.detailsPanelOpen,
      detailsItemId: itemId ?? state.detailsItemId,
    })),

  setDragOverFolder: (folderId) => set({ dragOverFolderId: folderId }),

  startDrag: (ids) => set({ draggingIds: ids }),

  endDrag: () => set({ draggingIds: [], dragOverFolderId: null }),

  canDropInto: (targetFolderId) => {
    const state = get();
    const { draggingIds, files } = state;
    if (draggingIds.length === 0) return false;
    const target = files[targetFolderId];
    if (!target || target.type !== "folder") return false;
    // Can't drop into self
    if (draggingIds.includes(targetFolderId)) return false;
    // Can't drop a folder into its own descendant
    for (const id of draggingIds) {
      const item = files[id];
      if (item?.type === "folder") {
        let checkId: string | null = targetFolderId;
        while (checkId) {
          if (checkId === id) return false;
          checkId = files[checkId]?.parentId ?? null;
        }
      }
    }
    return true;
  },

  toggleExpandFolder: (folderId) =>
    set((state) => {
      const next = new Set(state.expandedFolderIds);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return { expandedFolderIds: next };
    }),

  // ── Derived ──────────────────────────────────────────────────────────────

  getBreadcrumbs: () => {
    const state = get();
    const crumbs: BreadcrumbItem[] = [];
    let currentId: string | null = state.currentFolderId;
    while (currentId) {
      const item: FileItem | undefined = state.files[currentId];
      if (!item) break;
      crumbs.unshift({ id: currentId, name: item.name });
      currentId = item.parentId;
    }
    return crumbs;
  },

  getCurrentChildren: () => {
    const state = get();
    const folder = state.files[state.currentFolderId];
    if (!folder?.children) return [];

    let items = folder.children
      .map((id) => state.files[id])
      .filter(Boolean);

    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      items = items.filter((item) => item.name.toLowerCase().includes(q));
    }

    items.sort((a: FileItem, b: FileItem) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      const dir = state.sortDirection === "asc" ? 1 : -1;
      switch (state.sortField) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "modifiedAt":
          return dir * (new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime());
        case "size":
          return dir * ((a.size || 0) - (b.size || 0));
        case "type": {
          const extA = a.name.split(".").pop() || "";
          const extB = b.name.split(".").pop() || "";
          return dir * extA.localeCompare(extB);
        }
        default:
          return 0;
      }
    });

    return items;
  },

  isItemLocked: (id: string) => {
    return !!get().files[id]?.locked;
  },
}));
