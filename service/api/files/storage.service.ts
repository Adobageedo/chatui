import { createClient } from "@/lib/supabase/server";
import type { FileItem } from "@/lib/files/types";

// ── Bucket names ────────────────────────────────────────────────────────────

const USER_BUCKET = "user-files";
const ORG_BUCKET = "org-files";

// ── Types ───────────────────────────────────────────────────────────────────

export interface StorageLocation {
  bucket: string;
  path: string;
}

// ── Service ─────────────────────────────────────────────────────────────────

export class StorageService {
  /**
   * Resolve the storage location for a file item based on its scope.
   *
   * User-scope:  user-files/{userId}/{relativePath}
   * Org-scope:   org-files/{orgId}/{relativePath}
   */
  resolveLocation(
    item: FileItem,
    userId: string,
    organizationId: string,
    fileName?: string
  ): StorageLocation {
    const scope = item.scope ?? "user";
    const bucket = scope === "org" ? ORG_BUCKET : USER_BUCKET;
    const prefix = scope === "org" ? organizationId : userId;
    const name = fileName ?? item.name;

    return {
      bucket,
      path: `${prefix}/${item.rootFolderId}/${name}`,
    };
  }

  /**
   * Generate a signed upload URL (valid for 5 minutes)
   */
  async getSignedUploadUrl(
    location: StorageLocation,
    contentType?: string
  ): Promise<string> {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
      .from(location.bucket)
      .createSignedUploadUrl(location.path);

    if (error) throw new Error(`Failed to create upload URL: ${error.message}`);
    return data.signedUrl;
  }

  /**
   * Generate a signed download URL (valid for 15 minutes)
   */
  async getSignedDownloadUrl(location: StorageLocation): Promise<string> {
    const supabase = await createClient();

    const { data, error } = await supabase.storage
      .from(location.bucket)
      .createSignedUrl(location.path, 900); // 15 min

    if (error) throw new Error(`Failed to create download URL: ${error.message}`);
    return data.signedUrl;
  }

  /**
   * Upload a file buffer directly
   */
  async uploadFile(
    location: StorageLocation,
    fileBuffer: Buffer | ArrayBuffer,
    contentType: string
  ): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase.storage
      .from(location.bucket)
      .upload(location.path, fileBuffer, {
        contentType,
        upsert: false,
      });

    if (error) throw new Error(`Failed to upload file: ${error.message}`);
  }

  /**
   * Delete a file from storage
   */
  async deleteFile(location: StorageLocation): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase.storage
      .from(location.bucket)
      .remove([location.path]);

    if (error) throw new Error(`Failed to delete file: ${error.message}`);
  }

  /**
   * Copy a file within or across buckets
   */
  async copyFile(from: StorageLocation, to: StorageLocation): Promise<void> {
    const supabase = await createClient();

    const { data: fileData, error: downloadError } = await supabase.storage
      .from(from.bucket)
      .download(from.path);

    if (downloadError) throw new Error(`Failed to download source: ${downloadError.message}`);

    const buffer = await fileData.arrayBuffer();
    await this.uploadFile(to, buffer, fileData.type);
  }
}

export const storageService = new StorageService();
