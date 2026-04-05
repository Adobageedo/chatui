import { storageService as baseStorageService } from "@/lib/storage/storage.service";
import { StorageError } from "../shared/api-error";
import type { UploadResult } from "@/lib/storage/storage.service";

export interface UploadFileRequest {
  userId: string;
  file: File;
  folder?: string;
}

export interface DeleteFileRequest {
  filePath: string;
}

/**
 * Storage Service Layer
 * Handles file upload/delete business logic
 */
export class StorageApiService {
  /**
   * Upload a file
   */
  async uploadFile(request: UploadFileRequest): Promise<UploadResult> {
    try {
      return await baseStorageService.uploadFile({
        userId: request.userId,
        file: request.file,
        folder: request.folder,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      throw new StorageError(message);
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(request: DeleteFileRequest): Promise<void> {
    try {
      await baseStorageService.deleteFile(request.filePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      throw new StorageError(message);
    }
  }
}

export const storageApiService = new StorageApiService();
