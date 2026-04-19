/**
 * Chat Service Types
 */

export interface EmailContext {
  subject: string;
  from: string;
  body: string;
  to?: string;
  cc?: string;
  date?: Date;
  conversationId?: string;
  threadId?: string;
  messageId?: string;
  internetMessageId?: string;
  fullConversation?: string;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: Array<{
    type: string;
    text?: string;
    [key: string]: any;
  }>;
}

export interface ChatRequest {
  messages: ChatMessage[];
  emailContext?: EmailContext | null;
}

export interface ChatStreamOptions {
  model?: string;
  maxSteps?: number;
  temperature?: number;
  reasoningEnabled?: boolean;
  emailContext?: EmailContext | null;
  /**
   * Tools passed from frontend via context.tools
   * These are registered with useAui({ tools: Tools({ toolkit }) })
   * 
   * Note: Currently these are logged but not fully integrated due to
   * Zod schema serialization complexity. Backend uses its own tool
   * definitions as fallback. Tools still execute on frontend via LocalRuntime.
   */
  frontendTools?: Record<string, { description?: string; parameters: any }> | null;
}
