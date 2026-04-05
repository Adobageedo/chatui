/**
 * Chat Service Types
 */

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
}

export interface ChatStreamOptions {
  model?: string;
  maxSteps?: number;
  temperature?: number;
}
