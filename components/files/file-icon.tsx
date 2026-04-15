"use client";

import React from "react";
import { FileItem } from "../../lib/files/types";
import { FILE_MANAGER_CONFIG } from "../../lib/files/constants";
import {
  File,
  FileText,
  FileSpreadsheet,
  Image,
  Video,
  Music,
  Archive,
  Folder,
  FolderOpen,
  Presentation,
  PenTool,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_COMPONENTS: Record<string, React.ComponentType<{ className?: string }>> = {
  "folder": Folder,
  "folder-open": FolderOpen,
  "file-text": FileText,
  "file-spreadsheet": FileSpreadsheet,
  "presentation": Presentation,
  "image": Image,
  "video": Video,
  "music": Music,
  "archive": Archive,
  "pen-tool": PenTool,
  "file": File,
};

function resolveIconName(item: FileItem, isOpen?: boolean): string {
  if (item.type === "folder") return isOpen ? "folder-open" : "folder";
  const ext = item.name.split(".").pop()?.toLowerCase() ?? "";
  return FILE_MANAGER_CONFIG.mimeTypeIcons[ext] ?? "file";
}

interface FileIconProps {
  item: FileItem;
  size?: "sm" | "md" | "lg";
  isOpen?: boolean;
}

const SIZE_CLASSES = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-10 w-10" } as const;

export function FileIcon({ item, size = "md", isOpen }: FileIconProps) {
  const iconName = resolveIconName(item, isOpen);
  const IconComp = ICON_COMPONENTS[iconName] ?? File;
  const color = FILE_MANAGER_CONFIG.iconColors[iconName] ?? "text-muted-foreground";

  return <IconComp className={cn(SIZE_CLASSES[size], color)} />;
}
