"use client";

import { useState, useCallback, useMemo, useRef, type DragEvent } from "react";
import { toast } from "sonner";
import { useFileManagerStore } from "../../lib/files/store";
import { useUploadProgress } from "./use-upload-progress";
import {
  extractFilesFromDataTransfer,
  uploadFilesWithHierarchy,
  uploadSingleFile,
  type UploadProgressEvent,
} from "../../lib/files/upload-hierarchy";

/**
 * Returns true when the drag event originates from the user's desktop
 * (i.e. contains files), as opposed to an internal drag-and-drop move.
 */
function isExternalFileDrag(e: DragEvent): boolean {
  if (e.dataTransfer.types.includes("Files")) {
    // Internal drags set "application/x-file-ids" and/or "text/plain".
    // Desktop drags only have "Files".
    if (e.dataTransfer.types.includes("application/x-file-ids")) return false;
    if (e.dataTransfer.types.includes("text/plain")) return false;
    return true;
  }
  return false;
}

/**
 * Hook that provides drag-and-drop upload from the desktop.
 *
 * Returns:
 * - `isDraggingOver` – whether a desktop file is hovering over the drop zone
 * - `dropHandlers`   – `onDragEnter`, `onDragOver`, `onDragLeave`, `onDrop`
 *                       to spread onto the drop-zone element
 */
export function useDesktopDrop() {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);
  const uploadIdMap = useRef(new Map<string, string>());

  const { addItem, updateItem } = useUploadProgress();

  const handleProgress = useCallback(
    (event: UploadProgressEvent) => {
      // Get or create a stable unique ID for this file
      let itemId = uploadIdMap.current.get(event.fileName);
      if (!itemId) {
        itemId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        uploadIdMap.current.set(event.fileName, itemId);
      }

      if (event.status === "uploading") {
        addItem({ id: itemId, name: event.fileName, type: "upload", status: "uploading" });
      } else {
        updateItem(itemId, { status: event.status, error: event.error });
        // Clean up the map when upload is complete or errored
        if (event.status === "complete" || event.status === "error") {
          uploadIdMap.current.delete(event.fileName);
        }
      }
    },
    [addItem, updateItem]
  );

  const onDragEnter = useCallback(
    (e: DragEvent) => {
      if (!isExternalFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current++;
      if (dragCounter.current === 1) {
        setIsDraggingOver(true);
      }
    },
    []
  );

  const onDragOver = useCallback(
    (e: DragEvent) => {
      if (!isExternalFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
    },
    []
  );

  const onDragLeave = useCallback(
    (e: DragEvent) => {
      if (!isExternalFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current--;
      if (dragCounter.current <= 0) {
        dragCounter.current = 0;
        setIsDraggingOver(false);
      }
    },
    []
  );

  const onDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current = 0;
      setIsDraggingOver(false);

      // Only handle external file drops
      if (!e.dataTransfer.types.includes("Files")) return;
      // Skip if this is an internal drag (item ID in text/plain)
      if (e.dataTransfer.types.includes("text/plain") && e.dataTransfer.getData("text/plain")) return;

      const currentFolderId = useFileManagerStore.getState().currentFolderId;
      if (!currentFolderId) {
        toast.error("No folder selected");
        return;
      }

      try {
        const filesWithPaths = await extractFilesFromDataTransfer(e.dataTransfer.items);

        if (filesWithPaths.length === 0) {
          toast.error("No files found in drop");
          return;
        }

        // Check if there are subdirectories (folder drop)
        const hasSubdirs = filesWithPaths.some((f) => f.relativePath.includes("/"));

        if (hasSubdirs) {
          const result = await uploadFilesWithHierarchy(
            filesWithPaths,
            currentFolderId,
            handleProgress
          );
          if (result.failed > 0) {
            toast.error(`${result.failed} file(s) failed to upload`);
          }
        } else {
          // Simple file drop — upload each individually
          for (const { file } of filesWithPaths) {
            const result = await uploadSingleFile(file, currentFolderId, handleProgress);
            if (result.failed > 0) {
              toast.error(`Failed to upload ${file.name}`);
            }
          }
        }

        await useFileManagerStore.getState().fetchFiles(true);
      } catch (error) {
        console.error("Desktop drop upload failed:", error);
        toast.error("Failed to upload dropped files");
      }
    },
    [handleProgress]
  );

  const dropHandlers = useMemo(
    () => ({ onDragEnter, onDragOver, onDragLeave, onDrop }),
    [onDragEnter, onDragOver, onDragLeave, onDrop]
  );

  return { isDraggingOver, dropHandlers };
}
