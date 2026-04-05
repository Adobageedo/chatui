import { getSupabaseAdmin } from "@/lib/supabase/admin-client";

export interface UploadFileOptions {
  userId: string;
  file: File;
  folder?: string;
}

export interface UploadResult {
  id: string;
  url: string;
  path: string;
}

/**
 * Singleton Storage Service
 * Handles all file upload/download/delete operations
 */
class StorageService {
  private static instance: StorageService | null = null;
  private readonly bucketName = "documents";
  private readonly defaultFolder = "chat";

  private constructor() {}

  static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  /**
   * Upload file to storage
   */
  async uploadFile(options: UploadFileOptions): Promise<UploadResult> {
    const { userId, file, folder = this.defaultFolder } = options;
    const supabase = getSupabaseAdmin();

    // Generate unique filename
    const fileExt = file.name.split(".").pop();
    const timestamp = Date.now();
    const fileName = `${userId}/${folder}/${timestamp}.${fileExt}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from(this.bucketName).getPublicUrl(data.path);

    return {
      id: data.path,
      url: publicUrl,
      path: data.path,
    };
  }

  /**
   * Delete file from storage
   */
  async deleteFile(filePath: string): Promise<void> {
    const supabase = getSupabaseAdmin();

    const { error } = await supabase.storage
      .from(this.bucketName)
      .remove([decodeURIComponent(filePath)]);

    if (error) {
      throw new Error(`Delete failed: ${error.message}`);
    }
  }

  /**
   * Get signed URL for private files
   */
  async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .createSignedUrl(filePath, expiresIn);

    if (error || !data?.signedUrl) {
      throw new Error(`Failed to create signed URL: ${error?.message || "Unknown error"}`);
    }

    return data.signedUrl;
  }

  /**
   * Download file as buffer
   */
  async downloadFile(filePath: string): Promise<Buffer> {
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .download(filePath);

    if (error || !data) {
      throw new Error(`Download failed: ${error?.message || "Unknown error"}`);
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

export const storageService = StorageService.getInstance();
