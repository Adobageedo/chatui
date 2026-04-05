import { apiClient } from "./api-client";
import { API_ROUTES } from '@/config';

export interface UploadResponse {
  id: string;
  url: string;
  path: string;
}

/**
 * Upload Service
 * Client-side service for file upload operations
 */
class UploadService {
  private static instance: UploadService | null = null;

  private constructor() {}

  static getInstance(): UploadService {
    if (!UploadService.instance) {
      UploadService.instance = new UploadService();
    }
    return UploadService.instance;
  }

  /**
   * Upload a file
   */
  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.postFormData<UploadResponse>(API_ROUTES.upload.base, formData);
  }

  /**
   * Delete a file
   */
  async deleteFile(fileId: string): Promise<void> {
    return apiClient.delete<void>(API_ROUTES.upload.byId(fileId));
  }
}

export const uploadService = UploadService.getInstance();
