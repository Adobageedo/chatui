"use client";

import React, { useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useFileManagerStore } from "../../lib/files/store";
import { useUploadProgress } from "../../hooks/files/use-upload-progress";
import { FileItem } from "../../lib/files/types";
import {
  extractFilesFromDataTransfer,
  uploadFilesWithHierarchy,
  uploadSingleFile,
  type UploadProgressEvent,
} from "../../lib/files/upload-hierarchy";
import { toast } from "sonner";
import {
  ChevronRight,
  Folder,
  FolderOpen,
  HardDrive,
  Star,
  Users,
  Lock,
  FileKey,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const AUTO_EXPAND_DELAY = 800;

function TreeNode({ item, depth }: { item: FileItem; depth: number }) {
  const {
    files,
    currentFolderId,
    expandedFolderIds,
    toggleExpandFolder,
    navigateTo,
    moveItems,
    endDrag,
    setDragOverFolder,
    dragOverFolderId,
    draggingIds,
  } = useFileManagerStore();

  const { addItem, updateItem } = useUploadProgress();
  const uploadIdMap = useRef(new Map<string, string>());
  const autoExpandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUploadProgress = useCallback(
    (event: UploadProgressEvent) => {
      let uploadId = uploadIdMap.current.get(event.fileName);
      if (!uploadId) {
        uploadId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        uploadIdMap.current.set(event.fileName, uploadId);
      }
      if (event.status === "uploading") {
        addItem({ id: uploadId, name: event.fileName, type: "upload", status: "uploading" });
      } else {
        updateItem(uploadId, { status: event.status, error: event.error });
        if (event.status === "complete" || event.status === "error") {
          uploadIdMap.current.delete(event.fileName);
        }
      }
    },
    [addItem, updateItem]
  );

  // Clean up auto-expand timer on unmount
  useEffect(() => {
    return () => {
      if (autoExpandTimer.current) clearTimeout(autoExpandTimer.current);
    };
  }, []);

  const isExpanded = expandedFolderIds.has(item.id);
  const isActive = currentFolderId === item.id;
  const isDragOver = dragOverFolderId === item.id;
  const isInternalDrag = draggingIds.length > 0;
  const canDropInternal = isDragOver && isInternalDrag && useFileManagerStore.getState().canDropInto(item.id);
  const isInvalidDrop = isDragOver && isInternalDrag && !canDropInternal;
  const children = item.children
    ?.map((id) => files[id])
    .filter((f): f is FileItem => f?.type === "folder") ?? [];

  const handleClick = useCallback(() => {
    navigateTo(item.id);
  }, [navigateTo, item.id]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleExpandFolder(item.id);
    },
    [toggleExpandFolder, item.id]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Set drop effect based on validity
      if (e.dataTransfer.types.includes("application/x-file-ids")) {
        const canDrop = useFileManagerStore.getState().canDropInto(item.id);
        e.dataTransfer.dropEffect = canDrop ? "move" : "none";
      } else {
        e.dataTransfer.dropEffect = "copy";
      }

      setDragOverFolder(item.id);

      // Auto-expand collapsed folders after hovering
      if (!isExpanded && children.length > 0 && !autoExpandTimer.current) {
        autoExpandTimer.current = setTimeout(() => {
          toggleExpandFolder(item.id);
          autoExpandTimer.current = null;
        }, AUTO_EXPAND_DELAY);
      }
    },
    [setDragOverFolder, item.id, isExpanded, children.length, toggleExpandFolder]
  );

  const handleDragLeave = useCallback(() => {
    setDragOverFolder(null);
    if (autoExpandTimer.current) {
      clearTimeout(autoExpandTimer.current);
      autoExpandTimer.current = null;
    }
  }, [setDragOverFolder]);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverFolder(null);
      if (autoExpandTimer.current) {
        clearTimeout(autoExpandTimer.current);
        autoExpandTimer.current = null;
      }

      // Internal move: multi-item format
      const raw = e.dataTransfer.getData("application/x-file-ids");
      if (raw) {
        try {
          const ids: string[] = JSON.parse(raw);
          moveItems(ids, item.id);
        } catch { /* ignore */ }
        endDrag();
        return;
      }

      // Legacy single-item fallback
      const draggedId = e.dataTransfer.getData("text/plain");
      if (draggedId && draggedId !== item.id) {
        moveItems([draggedId], item.id);
        endDrag();
        return;
      }

      // Desktop file drop
      if (e.dataTransfer.types.includes("Files")) {
        try {
          const filesWithPaths = await extractFilesFromDataTransfer(e.dataTransfer.items);
          if (filesWithPaths.length === 0) return;

          const hasSubdirs = filesWithPaths.some((f) => f.relativePath.includes("/"));
          if (hasSubdirs) {
            const result = await uploadFilesWithHierarchy(filesWithPaths, item.id, handleUploadProgress);
            if (result.failed > 0) toast.error(`${result.failed} file(s) failed to upload`);
          } else {
            for (const { file } of filesWithPaths) {
              const result = await uploadSingleFile(file, item.id, handleUploadProgress);
              if (result.failed > 0) toast.error(`Failed to upload ${file.name}`);
            }
          }
          await useFileManagerStore.getState().fetchFiles(true);
        } catch {
          toast.error("Failed to upload dropped files");
        }
      }
    },
    [moveItems, endDrag, setDragOverFolder, item.id, handleUploadProgress]
  );

  const isRoot = item.parentId === null;

  const Icon =
    item.id === "root"
      ? HardDrive
      : isRoot && item.locked
        ? FileKey
        : item.id === "folder-shared"
          ? Users
          : isExpanded
            ? FolderOpen
            : Folder;

  return (
    <div>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm cursor-pointer select-none transition-all duration-150",
          isActive
            ? "bg-accent text-accent-foreground font-medium"
            : "hover:bg-muted text-muted-foreground hover:text-foreground",
          canDropInternal && "ring-2 ring-primary bg-primary/10 text-primary font-medium",
          isInvalidDrop && "ring-2 ring-destructive/40 bg-destructive/5",
          isDragOver && !isInternalDrag && "ring-2 ring-primary bg-primary/10",
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <button
          onClick={handleToggle}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm transition-transform",
            children.length === 0 && "invisible"
          )}
        >
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              isExpanded && "rotate-90"
            )}
          />
        </button>
        <Icon className={cn(
          "h-4 w-4 shrink-0",
          canDropInternal ? "text-primary" : "text-muted-foreground"
        )} />
        <span className="truncate">{item.name}</span>
        {canDropInternal && draggingIds.length > 1 && (
          <span className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {draggingIds.length}
          </span>
        )}
      </div>
      {isExpanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <TreeNode key={child.id} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function FileTree() {
  const { files, rootIds } = useFileManagerStore();

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        {rootIds.map((rootId, idx) => {
          const root = files[rootId];
          if (!root) return null;
          return (
            <div key={rootId} className={idx > 0 ? "mt-4" : ""}>
              <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {root.name}
              </p>
              <TreeNode item={root} depth={0} />
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
