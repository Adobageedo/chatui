"use client";

import React from "react";
import { useFileManagerStore } from "../../lib/files/store";
import { getDownloadUrl } from "../../lib/files/api-client";
import { formatFileSize, formatDate } from "../../lib/files/format-utils";
import { MetadataEntry } from "../../lib/files/types";
import { FileIcon } from "./file-icon";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Star,
  Download,
  Trash2,
  PenLine,
  Calendar,
  HardDrive,
  User,
  FileType,
  Clock,
  Users,
  Tag,
  ExternalLink,
} from "lucide-react";

export function FileDetailsPanel() {
  const {
    detailsPanelOpen,
    detailsItemId,
    selectedIds,
    files,
    toggleDetailsPanel,
    toggleStar,
    startRename,
    deleteSelected,
  } = useFileManagerStore();

  if (!detailsPanelOpen) return null;

  // Show multi-selection view if multiple items selected
  const isMultiSelection = selectedIds.size > 1;
  
  if (isMultiSelection) {
    return <MultiSelectionDetailsPanel />;
  }

  // Derive displayed item: prefer current selection, fall back to last explicit detailsItemId
  const activeItemId = selectedIds.size === 1
    ? Array.from(selectedIds)[0]
    : detailsItemId;
  const item = activeItemId ? files[activeItemId] : null;

  if (!item) {
    return (
      <div className="flex w-80 shrink-0 flex-col border-l bg-card">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Details</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => toggleDetailsPanel()}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
          Select an item to see details
        </div>
      </div>
    );
  }

  const ext = item.type === "file" ? item.name.split(".").pop()?.toUpperCase() : "Folder";

  return (
    <div className="flex w-80 shrink-0 flex-col border-l bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Details</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => toggleDetailsPanel()}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center gap-3 p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted">
            <FileIcon item={item} size="lg" />
          </div>
          <h4 className="text-center text-sm font-semibold break-all">
            {item.name}
          </h4>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs">
              {ext}
            </Badge>
            {item.shared && (
              <Badge variant="secondary" className="text-xs gap-1">
                <Users className="h-3 w-3" />
                Shared
              </Badge>
            )}
            {item.starred && (
              <Badge
                variant="secondary"
                className="text-xs gap-1 text-yellow-600"
              >
                <Star className="h-3 w-3 fill-yellow-400" />
                Starred
              </Badge>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-2 px-4 pb-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => toggleStar(item.id)}
          >
            <Star
              className={`h-3.5 w-3.5 ${
                item.starred ? "fill-yellow-400 text-yellow-400" : ""
              }`}
            />
            {item.starred ? "Unstar" : "Star"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={async () => {
              try {
                const url = await getDownloadUrl(item.id);
                const a = document.createElement("a");
                a.href = url;
                a.download = item.name;
                a.click();
              } catch {
                // silently fail — toast handled upstream
              }
            }}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Separator />

        <div className="space-y-4 p-4">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Properties
          </h5>

          <div className="space-y-3">
            <DetailRow icon={FileType} label="Type" value={ext ?? "Unknown"} />
            {item.type === "file" && (
              <DetailRow
                icon={HardDrive}
                label="Size"
                value={formatFileSize(item.size)}
              />
            )}
            {item.type === "folder" && item.children && (
              <DetailRow
                icon={HardDrive}
                label="Contains"
                value={`${item.children.length} items`}
              />
            )}
            <DetailRow icon={User} label="Owner" value={item.owner} />
            <DetailRow
              icon={Calendar}
              label="Created"
              value={formatDate(item.createdAt)}
            />
            <DetailRow
              icon={Clock}
              label="Modified"
              value={formatDate(item.modifiedAt)}
            />
          </div>
        </div>

        {item.metadata && item.metadata.length > 0 && (
          <>
            <Separator />
            <MetadataSection metadata={item.metadata} />
          </>
        )}

        <Separator />

        {!item.locked && (
          <div className="space-y-2 p-4">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Actions
            </h5>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => startRename(item.id)}
            >
              <PenLine className="h-4 w-4" />
              Rename
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              onClick={() => {
                deleteSelected();
                toggleDetailsPanel();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function MultiSelectionDetailsPanel() {
  const {
    selectedIds,
    files,
    toggleDetailsPanel,
    toggleStar,
    deleteSelected,
  } = useFileManagerStore();

  const selectedItems = Array.from(selectedIds).map((id) => files[id]).filter(Boolean);
  const fileCount = selectedItems.filter((i) => i.type === "file").length;
  const folderCount = selectedItems.filter((i) => i.type === "folder").length;
  const totalSize = selectedItems.reduce((acc, item) => acc + (item.size || 0), 0);
  const allStarred = selectedItems.every((i) => i.starred);
  const allLocked = selectedItems.every((i) => i.locked);

  return (
    <div className="flex w-80 shrink-0 flex-col border-l bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Details</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => toggleDetailsPanel()}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col items-center gap-3 p-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted">
            <HardDrive className="h-10 w-10 text-muted-foreground" />
          </div>
          <h4 className="text-center text-sm font-semibold">
            {selectedIds.size} items selected
          </h4>
          <div className="flex items-center gap-1.5">
            {fileCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {fileCount} file{fileCount !== 1 ? "s" : ""}
              </Badge>
            )}
            {folderCount > 0 && (
              <Badge variant="outline" className="text-xs">
                {folderCount} folder{folderCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-2 px-4 pb-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              selectedIds.forEach((id) => toggleStar(id));
            }}
          >
            <Star
              className={`h-3.5 w-3.5 ${
                allStarred ? "fill-yellow-400 text-yellow-400" : ""
              }`}
            />
            {allStarred ? "Unstar all" : "Star all"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={async () => {
              for (const id of selectedIds) {
                const item = files[id];
                if (!item) continue;
                try {
                  const url = await getDownloadUrl(id);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = item.name;
                  a.click();
                } catch {
                  // skip failed downloads
                }
              }
            }}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>

        <Separator />

        <div className="space-y-4 p-4">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Summary
          </h5>

          <div className="space-y-3">
            <DetailRow
              icon={HardDrive}
              label="Total size"
              value={formatFileSize(totalSize)}
            />
            <DetailRow
              icon={FileType}
              label="Items"
              value={`${selectedIds.size} selected`}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-2 p-4">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bulk Actions
          </h5>
          {!allLocked && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              onClick={() => {
                deleteSelected();
                toggleDetailsPanel();
              }}
            >
              <Trash2 className="h-4 w-4" />
              Delete all
            </Button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground w-20 shrink-0">{label}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}

function MetadataValue({ entry }: { entry: MetadataEntry }) {
  switch (entry.type) {
    case "badge":
      return (
        <Badge
          variant="secondary"
          className={`text-xs ${
            entry.value === "Active"
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : entry.value === "Expired"
                ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                : ""
          }`}
        >
          {entry.value}
        </Badge>
      );
    case "date":
      return <span className="truncate text-sm">{formatDate(entry.value)}</span>;
    case "currency":
      return (
        <span className="truncate text-sm font-medium">
          {new Intl.NumberFormat(undefined, {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 0,
          }).format(Number(entry.value))}
        </span>
      );
    case "link":
      return (
        <a
          href={entry.value.includes("@") ? `mailto:${entry.value}` : entry.value}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 truncate text-sm text-primary hover:underline"
        >
          {entry.value}
          <ExternalLink className="h-3 w-3 shrink-0" />
        </a>
      );
    default:
      return <span className="truncate text-sm">{entry.value}</span>;
  }
}

function MetadataSection({ metadata }: { metadata: MetadataEntry[] }) {
  // Group entries by their group key (ungrouped go under "general")
  const groups = metadata.reduce<Record<string, MetadataEntry[]>>((acc, entry) => {
    const key = entry.group || "general";
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-4 p-4">
      {Object.entries(groups).map(([groupName, entries]) => (
        <div key={groupName} className="space-y-3">
          <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <Tag className="h-3 w-3" />
            {groupName}
          </h5>
          <div className="space-y-2">
            {entries.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground w-24 shrink-0 text-xs">
                  {entry.name}
                </span>
                <MetadataValue entry={entry} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
