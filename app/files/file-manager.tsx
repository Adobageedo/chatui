"use client";

import React, { Suspense, useEffect } from "react";
import { FileTree } from "../../components/files/file-tree";
import { FileToolbar } from "../../components/files/file-toolbar";
import { FileBreadcrumbs } from "../../components/files/file-breadcrumbs";
import { FileContent } from "../../components/files/file-content";
import { FileDetailsPanel } from "../../components/files/file-details-panel";
import { UploadProgressModal } from "../../components/files/upload-progress-modal";
import { useFileKeyboardShortcuts } from "../../hooks/files/use-file-keyboard-shortcuts";
import { useFileUrlSync } from "../../hooks/files/use-file-url-sync";
import { useFileManagerStore } from "../../lib/files/store";
import { useUploadProgress } from "../../hooks/files/use-upload-progress";
import { Navbar } from "@/layout/navbar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { FolderOpen, Loader2 } from "lucide-react";

function FileManagerInner() {
  useFileKeyboardShortcuts();
  useFileUrlSync();
  const { fetchFiles, loading } = useFileManagerStore();
  const { items, clear } = useUploadProgress();

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return (
    <SidebarProvider>
      <div className="flex h-dvh w-full">
        <Sidebar>
          <SidebarHeader className="border-b px-4 py-3 h-16">
            <div className="flex items-center gap-2">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <FolderOpen className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-semibold">File Manager</span>
                <span className="text-xs text-muted-foreground">Explorer</span>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <FileTree />
          </SidebarContent>
          <SidebarFooter className="border-t p-0">
            {/* <StorageIndicator /> */}
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger />
            <Navbar hideLogo={true} />
          </header>

          <div className="flex flex-1 overflow-hidden">
            {loading ? (
              <div className="flex flex-1 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <main className="flex flex-1 flex-col overflow-hidden">
                  <FileToolbar />
                  <FileBreadcrumbs />
                  <FileContent />
                </main>
                <FileDetailsPanel />
              </>
            )}
          </div>
        </SidebarInset>
      </div>
      <UploadProgressModal items={items} onClose={clear} />
    </SidebarProvider>
  );
}

export function FileManager() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <FileManagerInner />
    </Suspense>
  );
}
