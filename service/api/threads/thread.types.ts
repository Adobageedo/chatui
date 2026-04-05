/**
 * Thread Service Types
 */

export interface Thread {
  id: string;
  organization_id: string;
  user_id: string;
  title: string | null;
  external_id: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ThreadMessage {
  id: string;
  thread_id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: any;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface CreateThreadRequest {
  title?: string | null;
  external_id?: string | null;
}

export interface UpdateThreadRequest {
  title?: string;
  is_archived?: boolean;
}

export interface CreateMessageRequest {
  role: "user" | "assistant" | "system" | "tool";
  content: any;
  metadata?: Record<string, any>;
}

export interface GenerateSuggestionsRequest {
  messages: any[];
}

export interface GenerateTitleRequest {
  messages: any[];
}

export interface ThreadListResponse {
  threads: Thread[];
}

export interface ThreadResponse {
  id: string;
  title: string | null;
  is_archived: boolean;
  status: "archived" | "regular";
}

export interface CreateThreadResponse {
  id: string;
  external_id: string | null;
}

export interface MessageListResponse {
  messages: ThreadMessage[];
}

export interface SuggestionsResponse {
  suggestions: string[];
}

export interface TitleResponse {
  title: string;
}
