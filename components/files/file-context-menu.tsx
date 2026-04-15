"use client";

import React from "react";
import { useFileManagerStore } from "../../lib/files/store";
import { getDownloadUrl } from "../../lib/files/api-client";
import { toast } from "sonner";
import { FileItem } from "../../lib/files/types";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  FolderPlus,
  Trash2,
  Copy,
  Scissors,
  ClipboardPaste,
  Star,
  Download,
  Info,
  PenLine,
  Link,
  FolderInput,
  Eye,
} from "lucide-react";

interface FileContextMenuProps {
  item: FileItem;
  children: React.ReactNode;
}

export function FileContextMenu({ item, children }: FileContextMenuProps) {
  const {
    selectedIds,
    toggleSelect,
    startRename,
    deleteSelected,
    toggleStar,
    copyToClipboard,
    paste,
    clipboard,
    toggleDetailsPanel,
    duplicateSelected,
    files,
    navigateTo,
  } = useFileManagerStore();

  const isLocked = !!item.locked;

  const handleAction = (action: () => void) => {
    if (!selectedIds.has(item.id)) {
      toggleSelect(item.id);
    }
    action();
  };

  const folders = Object.values(files).filter(
    (f) => f.type === "folder" && f.id !== item.id && f.id !== item.parentId
  );

  return (
    <ContextMenu onOpenChange={(open) => {
      if (open && !selectedIds.has(item.id)) {
        toggleSelect(item.id);
      }
    }}>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {item.type === "folder" && (
          <>
            <ContextMenuItem onClick={() => navigateTo(item.id)}>
              <Eye className="mr-2 h-4 w-4" />
              Open
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        {!isLocked && (
          <ContextMenuItem onClick={() => handleAction(() => copyToClipboard("cut"))}>
            <Scissors className="mr-2 h-4 w-4" />
            Cut
          </ContextMenuItem>
        )}
        <ContextMenuItem onClick={() => handleAction(() => copyToClipboard("copy"))}>
          <Copy className="mr-2 h-4 w-4" />
          Copy
        </ContextMenuItem>
        {clipboard && (
          <ContextMenuItem onClick={paste}>
            <ClipboardPaste className="mr-2 h-4 w-4" />
            Paste
          </ContextMenuItem>
        )}
        {!isLocked && (
          <ContextMenuItem onClick={() => handleAction(duplicateSelected)}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate
          </ContextMenuItem>
        )}
        {!isLocked && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => startRename(item.id)}>
              <PenLine className="mr-2 h-4 w-4" />
              Rename
            </ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>
                <FolderInput className="mr-2 h-4 w-4" />
                Move to
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="max-h-64 overflow-y-auto">
                {folders.slice(0, 15).map((folder) => (
                  <ContextMenuItem
                    key={folder.id}
                    onClick={() =>
                      useFileManagerStore.getState().moveItem(item.id, folder.id)
                    }
                  >
                    <FolderPlus className="mr-2 h-4 w-4" />
                    {folder.name}
                  </ContextMenuItem>
                ))}
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => toggleStar(item.id)}>
          <Star
            className={`mr-2 h-4 w-4 ${
              item.starred ? "fill-yellow-400 text-yellow-400" : ""
            }`}
          />
          {item.starred ? "Remove star" : "Add star"}
        </ContextMenuItem>
        <ContextMenuItem
          onClick={() => {
            const params = new URLSearchParams();
            if (item.type === "folder") {
              params.set("folder", item.id);
            } else {
              if (item.parentId && item.parentId !== "root") {
                params.set("folder", item.parentId);
              }
              params.set("file", item.id);
            }
            const qs = params.toString();
            const link = `${window.location.origin}/files${qs ? `?${qs}` : ""}`;
            navigator.clipboard.writeText(link).then(() => {
              toast.success("Link copied to clipboard");
            }).catch(() => {
              toast.error("Failed to copy link");
            });
          }}
        >
          <Link className="mr-2 h-4 w-4" />
          Copy link
        </ContextMenuItem>
        <ContextMenuItem
          onClick={async () => {
            try {
              const url = await getDownloadUrl(item.id);
              const a = document.createElement("a");
              a.href = url;
              a.download = item.name;
              a.click();
              toast.success(`Downloading "${item.name}"`);
            } catch {
              toast.error(`Failed to download "${item.name}"`);
            }
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={() => toggleDetailsPanel(item.id)}>
          <Info className="mr-2 h-4 w-4" />
          Details
        </ContextMenuItem>
        {!isLocked && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                if (!selectedIds.has(item.id)) {
                  toggleSelect(item.id);
                }
                setTimeout(() => deleteSelected(), 0);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
