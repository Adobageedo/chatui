// /**
//  * Chat Thread Types
//  * Types pour le système de threads de conversation
//  */

// export interface ChatThread {
//   id: string;
//   organization_id: string;
//   user_id: string;
//   title: string | null;
//   external_id: string | null;
//   is_archived: boolean;
//   created_at: string;
//   updated_at: string;
// }

// export interface ChatMessage {
//   id: string;
//   thread_id: string;
//   role: 'user' | 'assistant' | 'system' | 'tool';
//   content: any; // JSONB content
//   metadata?: Record<string, any>;
//   created_at: string;
// }

export interface CreateThreadInput {
  localId?: string;
  title?: string;
  external_id?: string;
}

export interface UpdateThreadInput {
  title?: string;
  is_archived?: boolean;
}

export interface CreateMessageInput {
  thread_id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: any;
  metadata?: Record<string, any>;
}

// export interface ThreadListResponse {
//   threads: ChatThread[];
// }

// export interface ThreadInitializeResponse {
//   id: string;
//   external_id?: string;
// }
