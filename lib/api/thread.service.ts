import { apiClient } from "./api-client";
import { API_ROUTES } from '@/config';

export interface Thread {
  id: string;
  external_id?: string;
  title?: string;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: unknown;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface CreateThreadResponse {
  id: string;
  external_id: string;
}

export interface ThreadListResponse {
  threads: Thread[];
}

export interface MessagesResponse {
  messages: Message[];
}

/**
 * Thread Service
 * Client-side service for thread operations
 */
class ThreadService {
  private static instance: ThreadService | null = null;

  private constructor() {}

  static getInstance(): ThreadService {
    if (!ThreadService.instance) {
      ThreadService.instance = new ThreadService();
    }
    return ThreadService.instance;
  }

  /**
   * List all threads
   */
  async listThreads(): Promise<ThreadListResponse> {
    return apiClient.get<ThreadListResponse>(API_ROUTES.threads.base);
  }

  /**
   * Create a new thread
   */
  async createThread(externalId: string): Promise<CreateThreadResponse> {
    return apiClient.post<CreateThreadResponse>(API_ROUTES.threads.base, {
      localId: externalId,
    });
  }

  /**
   * Get thread by ID
   */
  async getThread(threadId: string): Promise<Thread> {
    return apiClient.get<Thread>(API_ROUTES.threads.byId(threadId));
  }

  /**
   * Update thread
   */
  async updateThread(
    threadId: string,
    data: { title?: string }
  ): Promise<Thread> {
    return apiClient.put<Thread>(API_ROUTES.threads.byId(threadId), data);
  }

  /**
   * Delete thread
   */
  async deleteThread(threadId: string): Promise<void> {
    return apiClient.delete<void>(API_ROUTES.threads.byId(threadId));
  }

  /**
   * Archive thread
   */
  async archiveThread(threadId: string): Promise<void> {
    return apiClient.post<void>(API_ROUTES.threads.archive(threadId));
  }

  /**
   * Unarchive thread
   */
  async unarchiveThread(threadId: string): Promise<void> {
    return apiClient.post<void>(API_ROUTES.threads.unarchive(threadId));
  }

  /**
   * Get thread messages
   */
  async getMessages(threadId: string): Promise<MessagesResponse> {
    return apiClient.get<MessagesResponse>(
      API_ROUTES.threads.messages(threadId)
    );
  }

  /**
   * Add message to thread
   */
  async addMessage(
    threadId: string,
    message: { role: string; content: unknown }
  ): Promise<Message> {
    return apiClient.post<Message>(API_ROUTES.threads.messages(threadId), message);
  }

  /**
   * Generate thread title
   */
  async generateTitle(
    threadId: string,
    messages: unknown[]
  ): Promise<{ title: string }> {
    return apiClient.post<{ title: string }>(
      API_ROUTES.threads.title(threadId),
      { messages }
    );
  }

  /**
   * Generate suggestions
   */
  async generateSuggestions(
    threadId: string,
    messages: unknown[]
  ): Promise<{ suggestions: string[] }> {
    return apiClient.post<{ suggestions: string[] }>(
      API_ROUTES.threads.suggestions(threadId),
      { messages }
    );
  }
}

export const threadService = ThreadService.getInstance();
