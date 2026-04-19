"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Loader2, AlertCircle, Brain } from "lucide-react";
import type { SyncStatus } from "../../lib/files/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const CONFIG: Record<
  SyncStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    label: string;
    animate?: boolean;
  }
> = {
  synced: {
    icon: Brain,
    color: "text-green-500",
    label: "Indexed — searchable",
  },
  processing: {
    icon: Loader2,
    color: "text-blue-500",
    label: "Indexing…",
    animate: true,
  },
  pending: {
    icon: Clock,
    color: "text-muted-foreground",
    label: "Waiting to be indexed",
  },
  error: {
    icon: AlertCircle,
    color: "text-destructive",
    label: "Indexing failed",
  },
  not_applicable: {
    icon: CheckCircle2,
    color: "",
    label: "",
  },
};

type SyncStatusIconProps = {
  status?: SyncStatus;
  syncError?: string;
  size?: "sm" | "md";
  className?: string;
};

export function SyncStatusIcon({
  status,
  syncError,
  size = "sm",
  className,
}: SyncStatusIconProps) {
  if (!status || status === "not_applicable") return null;

  const cfg = CONFIG[status];
  const Icon = cfg.icon;
  const sizeClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const tooltip = syncError ? `${cfg.label}: ${syncError}` : cfg.label;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn("inline-flex shrink-0", className)}>
            <Icon
              className={cn(
                sizeClass,
                cfg.color,
                cfg.animate && "animate-spin"
              )}
            />
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type FolderSyncBadgeProps = {
  synced: number;
  total: number;
  status: SyncStatus;
  className?: string;
};

export function FolderSyncBadge({
  synced,
  total,
  status,
  className,
}: FolderSyncBadgeProps) {
  if (status === "not_applicable" || total === 0) return null;

  const cfg = CONFIG[status];
  const Icon = cfg.icon;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
              status === "synced" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
              status === "processing" && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
              status === "pending" && "bg-muted text-muted-foreground",
              status === "error" && "bg-destructive/10 text-destructive",
              className
            )}
          >
            <Icon
              className={cn(
                "h-3 w-3",
                cfg.animate && "animate-spin"
              )}
            />
            {synced}/{total}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {synced} of {total} files indexed
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
