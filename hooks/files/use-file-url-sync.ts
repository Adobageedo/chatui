"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useFileManagerStore } from "../../lib/files/store";

/**
 * Syncs file manager state ↔ URL query params.
 *
 * URL shape: /files?folder=<folderId>&file=<fileId>
 *   - `folder` — the currently open folder (defaults to "root")
 *   - `file`   — the selected / previewed file (optional)
 *
 * On mount (or page reload) the hook reads the URL and restores state.
 * On navigation / selection changes the hook pushes the URL silently.
 */
export function useFileUrlSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    currentFolderId,
    selectedIds,
    files,
    loading,
    navigateTo,
    toggleSelect,
    toggleDetailsPanel,
  } = useFileManagerStore();

  // Track whether we've already restored from URL on first load
  const restoredRef = useRef(false);

  // ── Restore state from URL after files are loaded ──────────────────────
  useEffect(() => {
    if (loading || restoredRef.current) return;
    if (Object.keys(files).length === 0) return;

    restoredRef.current = true;

    const folderParam = searchParams.get("folder");
    const fileParam = searchParams.get("file");

    // Restore folder
    if (folderParam && files[folderParam] && files[folderParam].type === "folder") {
      if (folderParam !== currentFolderId) {
        navigateTo(folderParam);
      }
    }

    // Restore file selection + open details panel
    if (fileParam && files[fileParam]) {
      // Small delay so navigateTo settles first
      setTimeout(() => {
        toggleSelect(fileParam);
        toggleDetailsPanel(fileParam);
      }, 0);
    }
  }, [loading, files, searchParams, currentFolderId, navigateTo, toggleSelect, toggleDetailsPanel]);

  // ── Push state → URL when folder / selection changes ───────────────────
  const prevFolderRef = useRef(currentFolderId);
  const prevSelectedRef = useRef(selectedIds);

  useEffect(() => {
    // Don't push URL until we've restored + files are loaded
    if (!restoredRef.current || loading) return;

    const folderChanged = prevFolderRef.current !== currentFolderId;
    const selectionChanged = prevSelectedRef.current !== selectedIds;

    if (!folderChanged && !selectionChanged) return;

    prevFolderRef.current = currentFolderId;
    prevSelectedRef.current = selectedIds;

    const params = new URLSearchParams();

    // Only add folder param if not the default root
    if (currentFolderId && currentFolderId !== "root") {
      params.set("folder", currentFolderId);
    }

    // Add file param for single selection (only files, not folders)
    if (selectedIds.size === 1) {
      const selectedId = Array.from(selectedIds)[0];
      const item = files[selectedId];
      if (item && item.type === "file") {
        params.set("file", selectedId);
      }
    }

    const qs = params.toString();
    const newUrl = qs ? `${pathname}?${qs}` : pathname;

    // Use replaceState to avoid polluting browser history on every click
    window.history.replaceState(null, "", newUrl);
  }, [currentFolderId, selectedIds, files, loading, pathname]);
}
