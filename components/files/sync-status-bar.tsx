"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Brain, CheckCircle2, Loader2, AlertCircle, Clock } from "lucide-react";
import type { SyncStats } from "../../lib/files/types";
import * as api from "../../lib/files/api-client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function SyncStatusBar() {
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchStats = async () => {
      try {
        const data = await api.fetchSyncStats();
        if (mounted) setStats(data);
      } catch {
        // silently fail
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchStats();
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>Loading index status…</span>
      </div>
    );
  }

  const { totalFiles, synced, pending, processing, error, totalChunks } = stats;
  const indexable = synced + pending + processing + error;
  const progress = indexable > 0 ? (synced / indexable) * 100 : 0;
  const isFullySynced = pending === 0 && processing === 0 && error === 0;
  const hasErrors = error > 0;
  const isProcessing = processing > 0;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col gap-2 px-4 py-3 cursor-default">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs">
                {isFullySynced ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                ) : hasErrors ? (
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                ) : isProcessing ? (
                  <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />
                ) : (
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                )}
                <span className="font-medium text-foreground">
                  {isFullySynced
                    ? "Index up to date"
                    : isProcessing
                    ? `Indexing ${processing} file${processing !== 1 ? "s" : ""}…`
                    : hasErrors
                    ? `${error} file${error !== 1 ? "s" : ""} failed`
                    : `${pending} pending`}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Brain className="h-3 w-3" />
                {totalChunks.toLocaleString()}
              </div>
            </div>
            <div className="w-full rounded-full bg-muted h-1 overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  hasErrors ? "bg-destructive" : isProcessing ? "bg-blue-500" : "bg-green-500"
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>{synced}/{indexable} files indexed</span>
              <span>{totalChunks.toLocaleString()} chunks</span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs space-y-1">
          <p className="font-medium">Vector Search Index</p>
          <p>{synced} synced, {pending} pending, {processing} processing, {error} errors</p>
          <p>{totalChunks.toLocaleString()} total chunks across {totalFiles} files</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
