"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { useFileManagerStore } from "../../lib/files/store";
import { FileItem } from "../../lib/files/types";
import { formatFileSize, formatDate } from "../../lib/files/format-utils";
import { FileIcon } from "./file-icon";
import { FileContextMenu } from "./file-context-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpDown,
  Star,
  Users,
  FolderOpen,
  Lock,
  Upload,
  GripVertical,
} from "lucide-react";
import { useDesktopDrop } from "../../hooks/files/use-desktop-drop";
import { SortField } from "../../lib/files/types";
import { useAuthContext } from "@/contexts/AuthContext";
import { SyncStatusIcon, FolderSyncBadge } from "./sync-status-icon";

// ── Drag ghost ────────────────────────────────────────────────────────────────

const DRAG_GHOST_ID = "__file-drag-ghost";

function createDragGhost(names: string[], count: number): HTMLElement {
  let ghost = document.getElementById(DRAG_GHOST_ID);
  if (ghost) ghost.remove();

  ghost = document.createElement("div");
  ghost.id = DRAG_GHOST_ID;
  ghost.style.cssText = `
    position: fixed; top: -1000px; left: -1000px;
    display: flex; align-items: center; gap: 8px;
    padding: 8px 14px; border-radius: 8px;
    background: hsl(var(--primary)); color: hsl(var(--primary-foreground));
    font-size: 13px; font-weight: 500; font-family: inherit;
    box-shadow: 0 4px 12px rgba(0,0,0,.15);
    white-space: nowrap; pointer-events: none; z-index: 9999;
  `;

  const label = count === 1 ? names[0] : `${count} items`;
  ghost.textContent = label;

  if (count > 1) {
    const badge = document.createElement("span");
    badge.style.cssText = `
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 20px; height: 20px; border-radius: 10px;
      background: hsl(var(--primary-foreground)); color: hsl(var(--primary));
      font-size: 11px; font-weight: 600; padding: 0 6px;
    `;
    badge.textContent = String(count);
    ghost.prepend(badge);
  }

  document.body.appendChild(ghost);
  return ghost;
}

function removeDragGhost() {
  document.getElementById(DRAG_GHOST_ID)?.remove();
}

// ── Shared drag helpers ───────────────────────────────────────────────────────

function useItemDrag(item: FileItem) {
  const { selectedIds, startDrag, files } = useFileManagerStore();

  return useCallback(
    (e: React.DragEvent) => {
      // If item is part of selection, drag all selected. Otherwise drag just this one.
      const ids = selectedIds.has(item.id) && selectedIds.size > 1
        ? Array.from(selectedIds).filter((id) => !files[id]?.locked)
        : [item.id];

      e.dataTransfer.setData("application/x-file-ids", JSON.stringify(ids));
      e.dataTransfer.setData("text/plain", ids[0]);
      e.dataTransfer.effectAllowed = "move";

      const names = ids.map((id) => files[id]?.name).filter(Boolean) as string[];
      const ghost = createDragGhost(names, ids.length);
      e.dataTransfer.setDragImage(ghost, 0, 0);

      startDrag(ids);
    },
    [item.id, selectedIds, files, startDrag]
  );
}

function useItemDrop(item: FileItem) {
  const { moveItems, setDragOverFolder, draggingIds } = useFileManagerStore();

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (item.type !== "folder") return;
      // Only for internal drags
      if (!e.dataTransfer.types.includes("application/x-file-ids")) return;
      e.preventDefault();
      e.stopPropagation();

      const canDrop = useFileManagerStore.getState().canDropInto(item.id);
      e.dataTransfer.dropEffect = canDrop ? "move" : "none";
      setDragOverFolder(item.id);
    },
    [item.id, item.type, setDragOverFolder]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();
      setDragOverFolder(null);
    },
    [setDragOverFolder]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const raw = e.dataTransfer.getData("application/x-file-ids");
      if (!raw || item.type !== "folder") return;

      try {
        const ids: string[] = JSON.parse(raw);
        moveItems(ids, item.id);
      } catch { /* ignore */ }
    },
    [item.id, item.type, moveItems]
  );

  const canDrop = item.type === "folder" &&
    draggingIds.length > 0 &&
    useFileManagerStore.getState().canDropInto(item.id);

  return { handleDragOver, handleDragLeave, handleDrop, canDrop };
}

function useDragEnd() {
  const { endDrag } = useFileManagerStore();
  return useCallback(() => {
    endDrag();
    removeDragGhost();
  }, [endDrag]);
}

function InlineRename({ item }: { item: FileItem }) {
  const { confirmRename, cancelRename } = useFileManagerStore();
  const [value, setValue] = useState(item.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const dotIndex = item.name.lastIndexOf(".");
    if (dotIndex > 0) {
      inputRef.current?.setSelectionRange(0, dotIndex);
    } else {
      inputRef.current?.select();
    }
  }, [item.name]);

  return (
    <Input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") confirmRename(value);
        if (e.key === "Escape") cancelRename();
      }}
      onBlur={() => confirmRename(value)}
      className="h-6 w-48 text-sm"
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function FileListRow({ item }: { item: FileItem }) {
  const {
    selectedIds,
    toggleSelect,
    navigateTo,
    renamingId,
    toggleStar,
    dragOverFolderId,
    draggingIds,
    toggleDetailsPanel,
  } = useFileManagerStore();
  const { user } = useAuthContext();

  const isSelected = selectedIds.has(item.id);
  const isRenaming = renamingId === item.id;
  const isDragging = draggingIds.includes(item.id);
  const isDragOver = dragOverFolderId === item.id && item.type === "folder";
  const canDrop = isDragOver && useFileManagerStore.getState().canDropInto(item.id);
  const isInvalidDrop = isDragOver && !canDrop && draggingIds.length > 0;

  // Display "Me" if owner matches current user, otherwise show owner ID (fallback until backend returns names)
  const ownerDisplay = item.owner === user?.id ? "Me" : item.owner;

  const handleDragStart = useItemDrag(item);
  const { handleDragOver, handleDragLeave, handleDrop } = useItemDrop(item);
  const handleDragEnd = useDragEnd();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const isMulti = e.metaKey || e.ctrlKey;
      if (item.type === "folder" && !isMulti) {
        navigateTo(item.id);
      } else {
        toggleSelect(item.id, isMulti);
      }
    },
    [item, toggleSelect, navigateTo]
  );

  const handleDoubleClick = useCallback(() => {
    if (item.type === "file") {
      toggleDetailsPanel(item.id);
    }
  }, [item, toggleDetailsPanel]);

  return (
    <FileContextMenu item={item}>
      <TableRow
        className={cn(
          "cursor-pointer select-none transition-all duration-150",
          isSelected && "bg-accent",
          isDragging && "opacity-40",
          canDrop && "ring-2 ring-inset ring-primary bg-primary/5",
          isInvalidDrop && "ring-2 ring-inset ring-destructive/40 bg-destructive/5",
        )}
        draggable={!item.locked}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onDragStart={!item.locked ? handleDragStart : undefined}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <TableCell className="w-10">
          <GripVertical className={cn(
            "h-4 w-4 text-muted-foreground/30 transition-opacity",
            item.locked ? "invisible" : "opacity-0 group-hover:opacity-100"
          )} />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <FileIcon item={item} />
            {isRenaming ? (
              <InlineRename item={item} />
            ) : (
              <span className="truncate font-medium">{item.name}</span>
            )}
            {item.locked && (
              <Lock className="h-3 w-3 shrink-0 text-muted-foreground/50" />
            )}
            {item.shared && (
              <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            )}
            {item.type === "file" && (
              <SyncStatusIcon status={item.syncStatus} syncError={item.syncError} />
            )}
            {item.type === "folder" && <FolderSyncIndicator folderId={item.id} />}
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {ownerDisplay}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {formatDate(item.modifiedAt)}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {item.type === "folder" ? "--" : formatFileSize(item.size)}
        </TableCell>
        <TableCell className="w-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleStar(item.id);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Star
              className={cn(
                "h-4 w-4",
                item.starred
                  ? "fill-yellow-400 text-yellow-400 opacity-100"
                  : "text-muted-foreground"
              )}
            />
          </button>
        </TableCell>
      </TableRow>
    </FileContextMenu>
  );
}

function FileGridCard({ item }: { item: FileItem }) {
  const {
    selectedIds,
    toggleSelect,
    navigateTo,
    renamingId,
    toggleStar,
    dragOverFolderId,
    draggingIds,
    toggleDetailsPanel,
  } = useFileManagerStore();

  const isSelected = selectedIds.has(item.id);
  const isRenaming = renamingId === item.id;
  const isDragging = draggingIds.includes(item.id);
  const isDragOver = dragOverFolderId === item.id && item.type === "folder";
  const canDrop = isDragOver && useFileManagerStore.getState().canDropInto(item.id);
  const isInvalidDrop = isDragOver && !canDrop && draggingIds.length > 0;

  const handleDragStart = useItemDrag(item);
  const { handleDragOver, handleDragLeave, handleDrop } = useItemDrop(item);
  const handleDragEnd = useDragEnd();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const isMulti = e.metaKey || e.ctrlKey;
      if (item.type === "folder" && !isMulti) {
        navigateTo(item.id);
      } else {
        toggleSelect(item.id, isMulti);
      }
    },
    [item, toggleSelect, navigateTo]
  );

  const handleDoubleClick = useCallback(() => {
    if (item.type === "file") {
      toggleDetailsPanel(item.id);
    }
  }, [item, toggleDetailsPanel]);

  return (
    <FileContextMenu item={item}>
      <div
        className={cn(
          "group relative flex flex-col items-center gap-2 rounded-lg border p-4 cursor-pointer select-none transition-all duration-150 hover:bg-muted/50",
          isSelected && "border-primary bg-accent",
          isDragging && "opacity-40 scale-95",
          canDrop && "ring-2 ring-primary bg-primary/5 scale-105",
          isInvalidDrop && "ring-2 ring-destructive/40 bg-destructive/5",
        )}
        draggable={!item.locked}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onDragStart={!item.locked ? handleDragStart : undefined}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* <Checkbox
            checked={isSelected}
            onClick={(e) => e.stopPropagation()}
            onCheckedChange={() => toggleSelect(item.id, true)}
          /> */}
        </div>
        <button
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            toggleStar(item.id);
          }}
        >
          <Star
            className={cn(
              "h-4 w-4",
              item.starred
                ? "fill-yellow-400 text-yellow-400 opacity-100"
                : "text-muted-foreground"
            )}
          />
        </button>
        <div className="flex h-16 w-16 items-center justify-center">
          <FileIcon item={item} size="lg" />
        </div>
        {isRenaming ? (
          <InlineRename item={item} />
        ) : (
          <p className="w-full truncate text-center text-sm font-medium">
            {item.name}
          </p>
        )}
        <div className="flex items-center gap-1.5">
          {item.type === "file" && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              {formatFileSize(item.size)}
            </Badge>
          )}
          {item.type === "file" && (
            <SyncStatusIcon status={item.syncStatus} syncError={item.syncError} />
          )}
          {item.type === "folder" && <FolderSyncIndicator folderId={item.id} />}
          {item.shared && (
            <Users className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      </div>
    </FileContextMenu>
  );
}

function FolderSyncIndicator({ folderId }: { folderId: string }) {
  const { getFolderSyncSummary } = useFileManagerStore();
  const { status, synced, total } = getFolderSyncSummary(folderId);
  return <FolderSyncBadge status={status} synced={synced} total={total} />;
}

function DropOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-primary bg-primary/5 backdrop-blur-[2px]">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Upload className="h-8 w-8 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-primary">Drop files here</p>
        <p className="text-sm text-muted-foreground">Files and folders will be uploaded to the current directory</p>
      </div>
    </div>
  );
}

export function FileContent() {
  const {
    viewMode,
    getCurrentChildren,
    sortField,
    sortDirection,
    setSort,
    selectAll,
    selectedIds,
    currentFolderId,
    files,
    moveItems,
    endDrag,
    setDragOverFolder,
  } = useFileManagerStore();

  const { isDraggingOver, dropHandlers } = useDesktopDrop();

  const items = getCurrentChildren();
  const currentFolder = files[currentFolderId];

  const combinedDragEnter = useCallback(
    (e: React.DragEvent) => {
      dropHandlers.onDragEnter(e);
    },
    [dropHandlers]
  );

  const combinedDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      // Internal move: highlight current folder as drop target
      setDragOverFolder(currentFolderId);
      // Desktop upload: forward to desktop handler
      dropHandlers.onDragOver(e);
    },
    [currentFolderId, setDragOverFolder, dropHandlers]
  );

  const combinedDragLeave = useCallback(
    (e: React.DragEvent) => {
      dropHandlers.onDragLeave(e);
    },
    [dropHandlers]
  );

  const combinedDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      // Internal move: check for multi-item IDs first, fall back to single
      const raw = e.dataTransfer.getData("application/x-file-ids");
      if (raw) {
        try {
          const ids: string[] = JSON.parse(raw);
          moveItems(ids, currentFolderId);
        } catch { /* ignore */ }
        endDrag();
        removeDragGhost();
        return;
      }
      // Legacy single-item fallback
      const draggedId = e.dataTransfer.getData("text/plain");
      if (draggedId) {
        moveItems([draggedId], currentFolderId);
        endDrag();
        removeDragGhost();
        return;
      }
      // Desktop upload: forward to desktop handler
      setDragOverFolder(null);
      dropHandlers.onDrop(e);
    },
    [currentFolderId, moveItems, endDrag, setDragOverFolder, dropHandlers]
  );

  const SortHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => setSort(field)}
    >
      {children}
      {sortField === field && (
        <ArrowUpDown className={cn("h-3 w-3", sortDirection === "desc" && "rotate-180")} />
      )}
    </button>
  );

  const content = items.length === 0 ? (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 text-muted-foreground">
      <FolderOpen className="h-16 w-16" />
      <div className="text-center">
        <p className="text-lg font-medium">This folder is empty</p>
        <p className="text-sm">Drop files here or use the New button to add items</p>
      </div>
    </div>
  ) : viewMode === "grid" ? (
    <ScrollArea className="flex-1">
      <div className="min-h-full grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3 p-4">
        {items.map((item) => (
          <FileGridCard key={item.id} item={item} />
        ))}
      </div>
    </ScrollArea>
  ) : (
    <ScrollArea className="flex-1">
      <div className="p-4">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>
                <Checkbox
                  checked={
                    selectedIds.size > 0 &&
                    currentFolder?.children?.length === selectedIds.size
                  }
                  onCheckedChange={(checked: boolean) => {
                    if (checked) selectAll();
                    else useFileManagerStore.getState().clearSelection();
                  }}
                />
              </TableHead>
              <TableHead>
                <SortHeader field="name">Name</SortHeader>
              </TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>
                <SortHeader field="modifiedAt">Modified</SortHeader>
              </TableHead>
              <TableHead>
                <SortHeader field="size">Size</SortHeader>
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <FileListRow key={item.id} item={item} />
            ))}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );

  return (
    <div
      className="relative flex flex-1 flex-col overflow-hidden"
      onDragEnter={combinedDragEnter}
      onDragOver={combinedDragOver}
      onDragLeave={combinedDragLeave}
      onDrop={combinedDrop}
    >
      {isDraggingOver && <DropOverlay />}
      {content}
    </div>
  );
}
