"use client";

import { useEffect, useCallback } from "react";
import { useFileManagerStore } from "../../lib/files/store";

export function useFileKeyboardShortcuts() {
  const {
    selectAll,
    clearSelection,
    copyToClipboard,
    paste,
    deleteSelected,
    selectedIds,
    clipboard,
  } = useFileManagerStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key === "a") {
        e.preventDefault();
        selectAll();
      }
      if (mod && e.key === "c" && selectedIds.size > 0) {
        e.preventDefault();
        copyToClipboard("copy");
      }
      if (mod && e.key === "x" && selectedIds.size > 0) {
        e.preventDefault();
        copyToClipboard("cut");
      }
      if (mod && e.key === "v" && clipboard) {
        e.preventDefault();
        paste();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedIds.size > 0 && !mod) {
          e.preventDefault();
          deleteSelected();
        }
      }
      if (e.key === "Escape") {
        clearSelection();
      }
    },
    [selectAll, clearSelection, copyToClipboard, paste, deleteSelected, selectedIds, clipboard]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
