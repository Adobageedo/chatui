import type { AttachmentAdapter } from "@assistant-ui/react";
import { uploadService } from "@/lib/api/upload.service";
import { APP_CONFIG } from '@/config';

/**
 * Attachment Adapter for LocalRuntime
 * Handles file and image uploads using upload service
 * 
 * Features:
 * - Image uploads (jpg, png, gif, webp, etc.)
 * - Document uploads (pdf, txt, etc.)
 * - File validation
 * - Upload to server via service layer
 */
export const attachmentAdapter: AttachmentAdapter = {
  // Accept images and common document types
  accept: APP_CONFIG.upload.acceptedFileTypes,

  /**
   * Called when user adds a file
   * Upload the file to your server and return attachment metadata
   */
  async add({ file }) {
    try {
      // Upload via service layer
      const { id, url } = await uploadService.uploadFile(file);

      // Determine attachment type
      const isImage = file.type.startsWith("image/");
      
      const attachment = {
        id,
        type: isImage ? ("image" as const) : ("document" as const),
        name: file.name,
        contentType: file.type,
        file,
        url,
        status: { type: "requires-action" as const, reason: "composer-send" as const },
      };
      
      return attachment;
    } catch (error) {
      console.error("❌ [Attachment] Upload error:", error);
      throw error;
    }
  },

  /**
   * Called when the message is sent
   * Convert attachment to message content
   */
  async send(attachment) {
    // Cast to access custom properties we added in the add() method
    const attachmentWithUrl = attachment as typeof attachment & { url: string };
    
    const result = {
      ...attachment,
      status: { type: "complete" as const },
      content: [
        attachment.type === "image"
          ? { type: "image" as const, image: attachmentWithUrl.url }
          : { 
              type: "text" as const, 
              text: `[Document: ${attachment.name}](${attachmentWithUrl.url})` 
            },
      ],
    };
    
    return result;
  },

  /**
   * Called when user removes attachment before sending
   * Clean up uploaded file
   */
  async remove(attachment) {
    try {
      await uploadService.deleteFile(attachment.id);
    } catch (error) {
      console.error("Attachment removal error:", error);
      // Don't throw - attachment is already removed from UI
    }
  },
};
