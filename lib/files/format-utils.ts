import { FileItem } from "./types";

/**
 * Utility functions for file display.
 * Data is now served by the backend API (/api/files).
 */

export function formatFileSize(bytes?: number): string {
  if (bytes === undefined) return "--";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function getFileIcon(item: FileItem): string {
  if (item.type === "folder") return "folder";
  const ext = item.name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf": return "file-text";
    case "doc": case "docx": return "file-text";
    case "xls": case "xlsx": return "file-spreadsheet";
    case "ppt": case "pptx": return "presentation";
    case "jpg": case "jpeg": case "png": case "gif": case "webp": case "svg": return "image";
    case "mp4": case "mov": case "avi": return "video";
    case "mp3": case "wav": case "ogg": return "music";
    case "zip": case "rar": case "7z": case "tar": return "archive";
    case "txt": case "md": return "file-text";
    case "fig": return "pen-tool";
    default: return "file";
  }
}

export function getTotalStorageUsed(files: Record<string, FileItem>): number {
  return Object.values(files).reduce((acc, f) => acc + (f.size || 0), 0);
}
