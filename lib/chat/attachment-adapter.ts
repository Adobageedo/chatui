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
      console.error("Attachment upload error:", error);
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
    
    let content;
    
    if (attachment.type === "image") {
      // For images, OpenAI can fetch from URL directly
      content = { type: "image" as const, image: attachmentWithUrl.url };
    } else {
      // For documents, fetch the content so LLM can actually read it
      try {
        const response = await fetch(attachmentWithUrl.url);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch document: ${response.statusText}`);
        }
        
        const documentContent = await response.text();
        
        // Limit content to prevent context window exceeded errors
        const maxContentLength = APP_CONFIG.upload.maxContentLength;
        const limitedContent = documentContent.length > maxContentLength 
          ? documentContent.substring(0, maxContentLength) + "\n\n[Content truncated...]"
          : documentContent;
        
        // Include actual document content for LLM to read
        content = { 
          type: "text" as const, 
          text: `File: ${attachment.name}\n\nContent:\n${limitedContent}` 
        };
      } catch (error) {
        // Fallback to link if fetch fails
        content = { 
          type: "text" as const, 
          text: `[Document: ${attachment.name}](${attachmentWithUrl.url})\n\nError: Could not fetch document content. Please check the URL.` 
        };
      }
    }
    
    const result = {
      ...attachment,
      status: { type: "complete" as const },
      content: [content],
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
