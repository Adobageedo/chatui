"use client";

import React, { useRef, useState, useCallback } from "react";
import { useFileManagerStore } from "../../lib/files/store";
import { toast } from "sonner";
import { getDownloadUrl } from "../../lib/files/api-client";
import {
  extractFilesWithPaths,
  uploadFilesWithHierarchy,
  uploadSingleFile,
  type UploadProgressEvent,
} from "../../lib/files/upload-hierarchy";
import { useUploadProgress } from "../../hooks/files/use-upload-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  FolderPlus,
  Trash2,
  Copy,
  Scissors,
  ClipboardPaste,
  Star,
  Download,
  LayoutGrid,
  List,
  Search,
  SortAsc,
  Info,
  MoreHorizontal,
  FileUp,
  Link as LinkIcon,
  FolderInput,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SortField } from "../../lib/files/types";

export function FileToolbar() {
  const {
    selectedIds,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    sortField,
    setSort,
    createFolder,
    deleteSelected,
    toggleStar,
    copyToClipboard,
    paste,
    clipboard,
    toggleDetailsPanel,
    duplicateSelected,
    files,
    currentFolderId,
  } = useFileManagerStore();

  const { addItem, updateItem } = useUploadProgress();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const uploadIdMap = useRef(new Map<string, string>());
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("Untitled folder");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const hasSelection = selectedIds.size > 0;
  const singleSelected = selectedIds.size === 1 ? files[Array.from(selectedIds)[0]] : null;
  const allSelectedLocked = hasSelection && Array.from(selectedIds).every((id) => files[id]?.locked);

  /** Shared progress handler — routes events into the upload progress store */
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

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      createFolder(newFolderName.trim());
      setNewFolderName("Untitled folder");
      setNewFolderOpen(false);
    }
  };

  const handleDelete = () => {
    deleteSelected();
    setDeleteOpen(false);
  };

  const handleDownload = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        const url = await getDownloadUrl(id);
        const item = files[id];
        const a = document.createElement("a");
        a.href = url;
        a.download = item?.name ?? id;
        a.click();
      } catch {
        toast.error(`Failed to download ${files[id]?.name ?? id}`);
      }
    }
    toast.success(`Downloading ${ids.length} item(s)`);
  };

  const handleCopyLink = () => {
    const ids = Array.from(selectedIds);
    const links = ids.map((id) => {
      const item = files[id];
      const params = new URLSearchParams();
      if (item?.type === "folder") {
        params.set("folder", id);
      } else {
        if (currentFolderId && currentFolderId !== "root") {
          params.set("folder", currentFolderId);
        }
        params.set("file", id);
      }
      const qs = params.toString();
      return `${window.location.origin}/files${qs ? `?${qs}` : ""}`;
    });
    navigator.clipboard.writeText(links.join("\n")).then(() => {
      toast.success("Link copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) {
      e.target.value = "";
      return;
    }

    if (!currentFolderId) {
      toast.error("No folder selected");
      e.target.value = "";
      return;
    }

    // Upload each file with progress tracking
    for (const file of Array.from(fileList)) {
      const result = await uploadSingleFile(file, currentFolderId, handleProgress);
      if (result.failed > 0) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    await useFileManagerStore.getState().fetchFiles(true);
    e.target.value = "";
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) {
      e.target.value = "";
      return;
    }

    if (!currentFolderId) {
      toast.error("No folder selected");
      e.target.value = "";
      return;
    }

    try {
      const filesWithPaths = extractFilesWithPaths(fileList);
      const result = await uploadFilesWithHierarchy(
        filesWithPaths,
        currentFolderId,
        handleProgress
      );

      if (result.failed > 0) {
        toast.error(`${result.failed} file(s) failed to upload`);
      }

      await useFileManagerStore.getState().fetchFiles(true);
    } catch (error) {
      toast.error("Failed to upload folder");
    }

    e.target.value = "";
  };

  const folders = Object.values(files).filter(
    (f) => f.type === "folder" && !selectedIds.has(f.id)
  );

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-2 border-b px-4 py-2">
        {/* Left: Actions */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="default" size="sm" className="gap-1.5">
                <Upload className="h-4 w-4" />
                New
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setNewFolderOpen(true)}>
                <FolderPlus className="mr-2 h-4 w-4" />
                New folder
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <FileUp className="mr-2 h-4 w-4" />
                Upload file
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => folderInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />
                Upload folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {hasSelection && (
            <>
              <div className="mx-1 h-5 w-px bg-border" />
              {!allSelectedLocked && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => copyToClipboard("cut")}
                    >
                      <Scissors className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Cut</TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => copyToClipboard("copy")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      if (singleSelected) toggleStar(singleSelected.id);
                      else {
                        selectedIds.forEach((id) => toggleStar(id));
                      }
                    }}
                  >
                    <Star
                      className={`h-4 w-4 ${
                        singleSelected?.starred ? "fill-yellow-400 text-yellow-400" : ""
                      }`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Toggle star</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Download</TooltipContent>
              </Tooltip>
              {!allSelectedLocked && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              )}

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleCopyLink}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy link</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {!allSelectedLocked && (
                    <DropdownMenuItem onClick={() => duplicateSelected()}>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                  )}
                  {selectedIds.size === 1 && !singleSelected?.locked && (
                    <DropdownMenuItem
                      onClick={() =>
                        useFileManagerStore.getState().startRename(Array.from(selectedIds)[0])
                      }
                    >
                      Rename
                    </DropdownMenuItem>
                  )}
                  {selectedIds.size === 1 && !singleSelected?.locked && folders.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger>
                          <FolderInput className="mr-2 h-4 w-4" />
                          Move to
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="max-h-64 overflow-y-auto">
                          {folders.slice(0, 15).map((folder) => (
                            <DropdownMenuItem
                              key={folder.id}
                              onClick={() =>
                                useFileManagerStore.getState().moveItem(Array.from(selectedIds)[0], folder.id)
                              }
                            >
                              <FolderPlus className="mr-2 h-4 w-4" />
                              {folder.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          {clipboard && (
            <>
              <div className="mx-1 h-5 w-px bg-border" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={paste}>
                    <ClipboardPaste className="h-4 w-4" />
                    Paste ({clipboard.itemIds.length})
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Paste {clipboard.action === "cut" ? "moved" : "copied"} items
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>

        {/* Center: Search */}
        <div className="flex flex-1 justify-center px-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-9"
            />
          </div>
        </div>

        {/* Right: View controls */}
        <div className="flex items-center gap-1">
          <Select
            value={sortField}
            onValueChange={(v) => setSort(v as SortField)}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SortAsc className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="modifiedAt">Modified</SelectItem>
              <SelectItem value="size">Size</SelectItem>
              <SelectItem value="type">Type</SelectItem>
            </SelectContent>
          </Select>

          <div className="mx-1 h-5 w-px bg-border" />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>List view</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Grid view</TooltipContent>
          </Tooltip>

          {hasSelection && (
            <>
              <div className="mx-1 h-5 w-px bg-border" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      const firstSelected = Array.from(selectedIds)[0];
                      toggleDetailsPanel(firstSelected);
                    }}
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Details</TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </div>

      {/* New Folder Dialog */}
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
          </DialogHeader>
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNewFolderOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedIds.size} item(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected items will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFolderUpload}
        {...({ webkitdirectory: "true", directory: "true" } as React.InputHTMLAttributes<HTMLInputElement>)}
      />
    </TooltipProvider>
  );
}
