"use client";

import React, { useCallback } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useFileManagerStore } from "../../lib/files/store";
import { getDownloadUrl } from "../../lib/files/api-client";
import { formatFileSize, formatDate } from "../../lib/files/format-utils";
import type { MetadataEntry, FileItem } from "../../lib/files/types";
import { FileIcon } from "./file-icon";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X, Star, Download, Trash2, PenLine, Calendar, HardDrive, User,
  FileType, Clock, Users, Tag, ExternalLink, Brain, AlertCircle,
  Loader2, CheckCircle2,
} from "lucide-react";

// ── Sync status config ──────────────────────────────────────────────────────

const SYNC_CFG: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  synced:     { icon: CheckCircle2, label: "Indexed",   color: "text-green-500" },
  processing: { icon: Loader2,      label: "Indexing…",  color: "text-blue-500" },
  pending:    { icon: Clock,        label: "Pending",    color: "text-muted-foreground" },
  error:      { icon: AlertCircle,  label: "Failed",     color: "text-destructive" },
};

// ── Shared primitives ───────────────────────────────────────────────────────

function PanelShell({ children }: { children: React.ReactNode }) {
  const { toggleDetailsPanel } = useFileManagerStore();
  return (
    <div className="flex w-72 min-w-56 max-w-80 shrink-0 flex-col border-l bg-card">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="text-sm font-semibold">Details</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleDetailsPanel()}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      {children}
    </div>
  );
}

function SectionHeading({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
      <Icon className="h-3 w-3" />
      {children}
    </h5>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center text-center gap-1">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span className="text-[10px] uppercase tracking-wider font-medium">{label}</span>
      </div>
      <span className="text-sm truncate max-w-full">{value}</span>
    </div>
  );
}

function ProgressBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className={cn("w-full rounded-full bg-muted h-1.5 overflow-hidden", className)}>
      <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Hero (icon + name + badges) ─────────────────────────────────────────────

function ItemHero({ icon, title, badges }: { icon: React.ReactNode; title: string; badges?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 p-6 pb-3">
      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted">{icon}</div>
      <h4 className="text-center text-sm font-semibold break-all">{title}</h4>
      {badges && <div className="flex flex-wrap items-center justify-center gap-1.5">{badges}</div>}
    </div>
  );
}

// ── Quick actions (star / download) ─────────────────────────────────────────

function QuickActions({
  starred,
  starLabel,
  onStar,
  onDownload,
}: {
  starred: boolean;
  starLabel: [string, string];
  onStar: () => void;
  onDownload: () => void;
}) {
  return (
    <div className="flex justify-center gap-2 px-4 pb-4">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onStar}>
        <Star className={cn("h-3.5 w-3.5", starred && "fill-yellow-400 text-yellow-400")} />
        {starred ? starLabel[1] : starLabel[0]}
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={onDownload}>
        <Download className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ── Actions section ─────────────────────────────────────────────────────────

function ActionsSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 p-4">
      <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{heading}</h5>
      {children}
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  variant = "ghost",
  destructive,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant?: "ghost" | "outline";
  destructive?: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant={variant}
      size="sm"
      className={cn("w-full justify-start gap-2", destructive && "text-destructive hover:text-destructive")}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}

// ── Main panel ──────────────────────────────────────────────────────────────

export function FileDetailsPanel() {
  const { detailsPanelOpen, detailsItemId, selectedIds, files } = useFileManagerStore();
  if (!detailsPanelOpen) return null;

  if (selectedIds.size > 1) return <MultiSelectionView />;

  const activeId = selectedIds.size === 1 ? Array.from(selectedIds)[0] : detailsItemId;
  const item = activeId ? files[activeId] : null;

  if (!item) {
    return (
      <PanelShell>
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
          Select an item to see details
        </div>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      <ScrollArea className="flex-1">
        <SingleItemView item={item} />
      </ScrollArea>
    </PanelShell>
  );
}

// ── Single item view ────────────────────────────────────────────────────────

function SingleItemView({ item }: { item: FileItem }) {
  const { toggleStar, startRename, deleteSelected, toggleDetailsPanel } = useFileManagerStore();
  const ext = item.type === "file" ? item.name.split(".").pop()?.toUpperCase() : "Folder";

  const handleDownload = useCallback(async () => {
    try {
      const url = await getDownloadUrl(item.id);
      Object.assign(document.createElement("a"), { href: url, download: item.name }).click();
    } catch {
      toast.error("File not available for download");
    }
  }, [item.id, item.name]);

  return (
    <>
      <ItemHero
        icon={<FileIcon item={item} size="lg" />}
        title={item.name}
        badges={
          <>
            <Badge variant="outline" className="text-xs">{ext}</Badge>
            {item.shared && <Badge variant="secondary" className="text-xs gap-1"><Users className="h-3 w-3" />Shared</Badge>}
            {item.starred && <Badge variant="secondary" className="text-xs gap-1 text-yellow-600"><Star className="h-3 w-3 fill-yellow-400" />Starred</Badge>}
          </>
        }
      />

      <QuickActions
        starred={item.starred}
        starLabel={["Star", "Unstar"]}
        onStar={() => toggleStar(item.id)}
        onDownload={handleDownload}
      />

      <Separator />
      <PropertiesSection item={item} ext={ext} />

      {item.metadata && item.metadata.length > 0 && (
        <><Separator /><MetadataSection metadata={item.metadata} /></>
      )}

      <Separator />
      <SyncSection item={item} />

      {!item.locked && (
        <>
          <Separator />
          <ActionsSection heading="Actions">
            <ActionButton icon={PenLine} label="Rename" onClick={() => startRename(item.id)} />
            <ActionButton icon={Trash2} label="Delete" destructive onClick={() => { deleteSelected(); toggleDetailsPanel(); }} />
          </ActionsSection>
        </>
      )}
    </>
  );
}

// ── Properties ──────────────────────────────────────────────────────────────

function useOwnerName(ownerId?: string) {
  const { user } = useAuthContext();
  if (!ownerId) return "Unknown";
  return ownerId === user?.id ? "Me" : ownerId;
}

function PropertiesSection({ item, ext }: { item: FileItem; ext?: string }) {
  const ownerName = useOwnerName(item.ownerId);
  return (
    <div className="space-y-4 p-4">
      <SectionHeading icon={FileType}>Properties</SectionHeading>
      <div className="grid grid-cols-2 gap-4">
        <DetailRow icon={FileType} label="Type" value={ext ?? "Unknown"} />
        {item.type === "file" && <DetailRow icon={HardDrive} label="Size" value={formatFileSize(item.size)} />}
        {item.type === "folder" && item.children && <DetailRow icon={HardDrive} label="Contains" value={`${item.children.length} items`} />}
        <DetailRow icon={User} label="Owner" value={ownerName} />
        <DetailRow icon={Calendar} label="Created" value={formatDate(item.createdAt)} />
        <DetailRow icon={Clock} label="Modified" value={formatDate(item.modifiedAt)} />
      </div>
    </div>
  );
}

// ── Multi-selection view ────────────────────────────────────────────────────

function MultiSelectionView() {
  const { selectedIds, files, toggleStar, deleteSelected, toggleDetailsPanel } = useFileManagerStore();
  const items = Array.from(selectedIds).map((id) => files[id]).filter(Boolean);
  const fileCount = items.filter((i) => i.type === "file").length;
  const folderCount = items.filter((i) => i.type === "folder").length;
  const totalSize = items.reduce((acc, i) => acc + (i.size || 0), 0);
  const allStarred = items.every((i) => i.starred);
  const allLocked = items.every((i) => i.locked);

  const handleDownloadAll = useCallback(async () => {
    for (const id of selectedIds) {
      const item = files[id];
      if (!item) continue;
      try {
        const url = await getDownloadUrl(id);
        Object.assign(document.createElement("a"), { href: url, download: item.name }).click();
      } catch { toast.error(`"${item.name}" not available for download`); }
    }
  }, [selectedIds, files]);

  return (
    <PanelShell>
      <ScrollArea className="flex-1">
        <ItemHero
          icon={<HardDrive className="h-10 w-10 text-muted-foreground" />}
          title={`${selectedIds.size} items selected`}
          badges={
            <>
              {fileCount > 0 && <Badge variant="outline" className="text-xs">{fileCount} file{fileCount !== 1 ? "s" : ""}</Badge>}
              {folderCount > 0 && <Badge variant="outline" className="text-xs">{folderCount} folder{folderCount !== 1 ? "s" : ""}</Badge>}
            </>
          }
        />

        <QuickActions
          starred={allStarred}
          starLabel={["Star all", "Unstar all"]}
          onStar={() => selectedIds.forEach((id) => toggleStar(id))}
          onDownload={handleDownloadAll}
        />

        <Separator />
        <div className="space-y-4 p-4">
          <SectionHeading icon={HardDrive}>Summary</SectionHeading>
          <div className="grid grid-cols-2 gap-4">
            <DetailRow icon={HardDrive} label="Total size" value={formatFileSize(totalSize)} />
            <DetailRow icon={FileType} label="Items" value={`${selectedIds.size} selected`} />
          </div>
        </div>

        {!allLocked && (
          <>
            <Separator />
            <ActionsSection heading="Bulk Actions">
              <ActionButton icon={Trash2} label="Delete all" destructive onClick={() => { deleteSelected(); toggleDetailsPanel(); }} />
            </ActionsSection>
          </>
        )}
      </ScrollArea>
    </PanelShell>
  );
}

// ── Sync section ────────────────────────────────────────────────────────────

function SyncStatusRow({ status }: { status: string }) {
  const cfg = SYNC_CFG[status] ?? SYNC_CFG.pending;
  const Icon = cfg.icon;
  return (
    <div className="flex flex-col items-center text-center gap-1">
      <div className="flex items-center gap-1 text-muted-foreground">
        <span className="text-[10px] uppercase tracking-wider font-medium">Status</span>
      </div>
      <div className="flex items-center gap-1.5 text-sm">
        <Icon className={cn("h-3.5 w-3.5", cfg.color, status === "processing" && "animate-spin")} />
        <span>{cfg.label}</span>
      </div>
    </div>
  );
}

function SyncSection({ item }: { item: FileItem }) {
  const { getFolderSyncSummary } = useFileManagerStore();

  if (item.type === "folder") {
    const { status, synced, total } = getFolderSyncSummary(item.id);
    if (total === 0) return null;
    const label = status === "synced" ? "All indexed" : status === "processing" ? "Indexing…" : status === "error" ? "Some files failed" : "Pending";
    return (
      <div className="space-y-4 p-4">
        <SectionHeading icon={Brain}>Search Index</SectionHeading>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <SyncStatusRow status={status} />
            <div className="flex flex-col items-center text-center gap-1">
              <div className="flex items-center gap-1 text-muted-foreground">
                <span className="text-[10px] uppercase tracking-wider font-medium">Files</span>
              </div>
              <span className="text-sm">{synced} / {total} indexed</span>
            </div>
          </div>
          <ProgressBar value={synced} max={total} />
        </div>
      </div>
    );
  }

  const syncStatus = item.syncStatus ?? "not_applicable";
  if (syncStatus === "not_applicable") return null;

  return (
    <div className="space-y-4 p-4">
      <SectionHeading icon={Brain}>Search Index</SectionHeading>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <SyncStatusRow status={syncStatus} />
          {item.syncedAt && <DetailRow icon={Clock} label="Synced" value={formatDate(item.syncedAt)} />}
          {item.chunkCount != null && item.chunkCount > 0 && <DetailRow icon={Brain} label="Chunks" value={`${item.chunkCount} indexed`} />}
        </div>
        {item.syncError && (
          <div className="flex flex-col items-center text-center gap-1">
            <div className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span className="text-[10px] uppercase tracking-wider font-medium">Error</span>
            </div>
            <span className="text-destructive text-xs">{item.syncError}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Metadata section ────────────────────────────────────────────────────────

function MetadataValue({ entry }: { entry: MetadataEntry }) {
  switch (entry.type) {
    case "badge":
      return (
        <Badge
          variant="secondary"
          className={cn("text-xs",
            entry.value === "Active" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            entry.value === "Expired" && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
          )}
        >
          {entry.value}
        </Badge>
      );
    case "date":
      return <span className="truncate text-sm">{formatDate(entry.value)}</span>;
    case "currency":
      return (
        <span className="truncate text-sm font-medium">
          {new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(Number(entry.value))}
        </span>
      );
    case "link":
      return (
        <a
          href={entry.value.includes("@") ? `mailto:${entry.value}` : entry.value}
          target="_blank" rel="noopener noreferrer"
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
  const groups = metadata.reduce<Record<string, MetadataEntry[]>>((acc, entry) => {
    const key = entry.group || "general";
    (acc[key] ??= []).push(entry);
    return acc;
  }, {});

  return (
    <div className="space-y-4 p-4">
      {Object.entries(groups).map(([groupName, entries]) => (
        <div key={groupName} className="space-y-3">
          <SectionHeading icon={Tag}>{groupName}</SectionHeading>
          <div className="space-y-2">
            {entries.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground w-24 shrink-0 text-xs">{entry.name}</span>
                <MetadataValue entry={entry} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
