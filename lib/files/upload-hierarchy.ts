import { createFolder, uploadFile } from "./api-client";

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum individual file size (100 MB) */
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

// ── Types ────────────────────────────────────────────────────────────────────

export type FileWithPath = {
  file: File;
  relativePath: string;
};

export type UploadProgressEvent = {
  completed: number;
  total: number;
  fileName: string;
  status: "uploading" | "complete" | "error";
  error?: string;
};

export type ProgressCallback = (event: UploadProgressEvent) => void;

export type UploadResult = {
  total: number;
  succeeded: number;
  failed: number;
  errors: Array<{ fileName: string; error: string }>;
};

// ── Folder hierarchy upload ──────────────────────────────────────────────────

/**
 * Upload files preserving their folder hierarchy.
 *
 * 1. Creates all necessary folders depth-first (sequential to respect ordering)
 * 2. Uploads all files in parallel using `allSettled` so one failure doesn't
 *    abort the rest
 * 3. Reports per-file progress via the optional callback
 */
export async function uploadFilesWithHierarchy(
  filesWithPaths: FileWithPath[],
  rootFolderId: string,
  onProgress?: ProgressCallback
): Promise<UploadResult> {
  const result: UploadResult = {
    total: filesWithPaths.length,
    succeeded: 0,
    failed: 0,
    errors: [],
  };

  if (filesWithPaths.length === 0) return result;

  // ── Validate file sizes up-front ─────────────────────────────────────────
  const oversized = filesWithPaths.filter((f) => f.file.size > MAX_FILE_SIZE);
  if (oversized.length > 0) {
    for (const f of oversized) {
      const msg = `File exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB limit`;
      result.failed++;
      result.errors.push({ fileName: f.relativePath, error: msg });
      onProgress?.({
        completed: 0,
        total: result.total,
        fileName: f.relativePath,
        status: "error",
        error: msg,
      });
    }
    // Remove oversized from processing
    filesWithPaths = filesWithPaths.filter((f) => f.file.size <= MAX_FILE_SIZE);
  }

  // ── Group files by directory path ────────────────────────────────────────
  const pathMap = new Map<string, FileWithPath[]>();

  for (const item of filesWithPaths) {
    const dirPath = item.relativePath.split("/").slice(0, -1).join("/");
    if (!pathMap.has(dirPath)) {
      pathMap.set(dirPath, []);
    }
    pathMap.get(dirPath)!.push(item);
  }

  // Sort by depth so parents are created before children
  const sortedPaths = Array.from(pathMap.keys()).sort((a, b) => {
    const depthA = a ? a.split("/").length : 0;
    const depthB = b ? b.split("/").length : 0;
    return depthA - depthB;
  });

  // ── Create folders (sequential, depth-first) ────────────────────────────
  const folderIdMap = new Map<string, string>();
  folderIdMap.set("", rootFolderId);

  for (const path of sortedPaths) {
    if (!path) continue;

    const parts = path.split("/");
    let currentPath = "";

    for (const part of parts) {
      const parentPath = currentPath;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (!folderIdMap.has(currentPath)) {
        const parentId = folderIdMap.get(parentPath)!;
        const newFolder = await createFolder(part, parentId);
        folderIdMap.set(currentPath, newFolder.id);
      }
    }
  }

  // ── Upload files (parallel, resilient) ───────────────────────────────────
  let completed = 0;

  const promises = filesWithPaths.map(({ file, relativePath }) => {
    const dirPath = relativePath.split("/").slice(0, -1).join("/");
    const parentId = folderIdMap.get(dirPath) ?? rootFolderId;

    onProgress?.({
      completed,
      total: result.total,
      fileName: relativePath,
      status: "uploading",
    });

    return uploadFile(file, parentId)
      .then(() => {
        completed++;
        result.succeeded++;
        onProgress?.({
          completed,
          total: result.total,
          fileName: relativePath,
          status: "complete",
        });
      })
      .catch((err: unknown) => {
        completed++;
        result.failed++;
        const msg = err instanceof Error ? err.message : "Upload failed";
        result.errors.push({ fileName: relativePath, error: msg });
        onProgress?.({
          completed,
          total: result.total,
          fileName: relativePath,
          status: "error",
          error: msg,
        });
      });
  });

  await Promise.allSettled(promises);

  return result;
}

// ── Single file upload ───────────────────────────────────────────────────────

/**
 * Upload a single file to a target folder with progress tracking.
 */
export async function uploadSingleFile(
  file: File,
  parentId: string,
  onProgress?: ProgressCallback
): Promise<UploadResult> {
  const result: UploadResult = { total: 1, succeeded: 0, failed: 0, errors: [] };

  if (file.size > MAX_FILE_SIZE) {
    const msg = `File exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB limit`;
    result.failed = 1;
    result.errors.push({ fileName: file.name, error: msg });
    onProgress?.({ completed: 1, total: 1, fileName: file.name, status: "error", error: msg });
    return result;
  }

  onProgress?.({ completed: 0, total: 1, fileName: file.name, status: "uploading" });

  try {
    await uploadFile(file, parentId);
    result.succeeded = 1;
    onProgress?.({ completed: 1, total: 1, fileName: file.name, status: "complete" });
  } catch (err: unknown) {
    result.failed = 1;
    const msg = err instanceof Error ? err.message : "Upload failed";
    result.errors.push({ fileName: file.name, error: msg });
    onProgress?.({ completed: 1, total: 1, fileName: file.name, status: "error", error: msg });
  }

  return result;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extract files with their relative paths from an `<input webkitdirectory>` FileList.
 */
export function extractFilesWithPaths(fileList: FileList): FileWithPath[] {
  const filesWithPaths: FileWithPath[] = [];

  for (let i = 0; i < fileList.length; i++) {
    const file = fileList[i];
    const relativePath =
      (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
      file.name;

    filesWithPaths.push({ file, relativePath });
  }

  return filesWithPaths;
}

/**
 * Extract files (including folder contents) from a desktop drag-and-drop
 * `DataTransferItemList`. Uses the File System Access API
 * (`webkitGetAsEntry`) to recursively read directories.
 */
export async function extractFilesFromDataTransfer(
  items: DataTransferItemList
): Promise<FileWithPath[]> {
  const result: FileWithPath[] = [];

  const readEntry = (
    entry: FileSystemEntry,
    path: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (entry.isFile) {
        (entry as FileSystemFileEntry).file((file) => {
          result.push({ file, relativePath: path + file.name });
          resolve();
        }, reject);
      } else if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        const readAll = (allEntries: FileSystemEntry[] = []): void => {
          reader.readEntries((entries) => {
            if (entries.length === 0) {
              Promise.all(
                allEntries.map((e) => readEntry(e, path + entry.name + "/"))
              )
                .then(() => resolve())
                .catch(reject);
            } else {
              readAll([...allEntries, ...entries]);
            }
          }, reject);
        };
        readAll();
      } else {
        resolve();
      }
    });
  };

  const promises: Promise<void>[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind !== "file") continue;
    const entry = item.webkitGetAsEntry?.();
    if (entry) {
      promises.push(readEntry(entry, ""));
    } else {
      const file = item.getAsFile();
      if (file) {
        result.push({ file, relativePath: file.name });
      }
    }
  }
  await Promise.all(promises);

  return result;
}
