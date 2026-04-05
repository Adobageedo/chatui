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
}
