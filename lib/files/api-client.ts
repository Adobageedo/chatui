/**
 * Typed API client for the file manager.
 * All mutations go through these functions so swapping the backend
 * (e.g. Supabase) only requires changing this file.
 */

import { FileItem, MetadataEntry } from "./types";

const BASE = "/api/files";

// ── Helpers ──────────────────────────────────────────────────────────────────

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
}

// ── Queries ──────────────────────────────────────────────────────────────────

export async function fetchAllFiles(): Promise<{
  files: Record<string, FileItem>;
  rootIds: string[];
}> {
  return request(`${BASE}`);
}

export async function fetchFile(id: string): Promise<FileItem> {
  return request(`${BASE}/${id}`);
}

// ── Mutations ────────────────────────────────────────────────────────────────

export async function createFolder(
  name: string,
  parentId: string
): Promise<FileItem> {
  return request(`${BASE}`, {
    method: "POST",
    body: JSON.stringify({ name, type: "folder", parentId }),
  });
}

export async function createFile(
  name: string,
  parentId: string,
  size: number,
  mimeType: string,
  metadata?: MetadataEntry[]
): Promise<FileItem> {
  return request(`${BASE}`, {
    method: "POST",
    body: JSON.stringify({ name, type: "file", parentId, size, mimeType, metadata }),
  });
}

export async function renameItem(
  id: string,
  name: string
): Promise<FileItem> {
  return request(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ name }),
  });
}

export async function updateMetadata(
  id: string,
  metadata: MetadataEntry[]
): Promise<FileItem> {
  return request(`${BASE}/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ metadata }),
  });
}

export async function deleteItem(id: string): Promise<void> {
  await request(`${BASE}/${id}`, { method: "DELETE" });
}

export async function deleteItems(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deleteItem(id)));
}

export async function moveItem(
  id: string,
  targetFolderId: string
): Promise<FileItem> {
  return request(`${BASE}/${id}/move`, {
    method: "POST",
    body: JSON.stringify({ targetFolderId }),
  });
}

export async function duplicateItem(id: string, targetParentId?: string): Promise<FileItem> {
  return request(`${BASE}/${id}/duplicate`, {
    method: "POST",
    body: targetParentId ? JSON.stringify({ targetParentId }) : undefined,
  });
}

export async function toggleStar(id: string): Promise<FileItem> {
  return request(`${BASE}/${id}/star`, { method: "POST" });
}

// ── Upload (multipart → Supabase Storage) ───────────────────────────────────

export async function uploadFile(
  file: File,
  parentId: string,
  metadata?: MetadataEntry[]
): Promise<FileItem> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("parentId", parentId);
  if (metadata) {
    formData.append("metadata", JSON.stringify(metadata));
  }

  const res = await fetch(`${BASE}/upload`, {
    method: "POST",
    body: formData,
    // No Content-Type header — browser sets multipart boundary automatically
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }
  return res.json() as Promise<FileItem>;
}

export async function uploadFiles(
  files: FileList | File[],
  parentId: string
): Promise<FileItem[]> {
  const items: FileItem[] = [];
  for (const file of Array.from(files)) {
    items.push(await uploadFile(file, parentId));
  }
  return items;
}

// ── Download (signed URL from Supabase Storage) ─────────────────────────────

export async function getDownloadUrl(id: string): Promise<string> {
  const data = await request<{ url: string }>(`${BASE}/${id}/download`);
  return data.url;
}
