import { createClient } from "@/lib/supabase/server";
import type { Thread, ThreadMessage, CreateThreadRequest, UpdateThreadRequest, CreateMessageRequest } from "./thread.types";

/**
 * Thread Repository - Data Access Layer
 * Handles all database operations for threads
 */
export class ThreadRepository {
  /**
   * Get user's organization ID
   */
  async getUserOrganizationId(userId: string): Promise<string> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("organization_users")
      .select("organization_id")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      throw new Error("User organization not found");
    }

    return data.organization_id;
  }

  /**
   * List all threads for a user
   */
  async listThreads(userId: string): Promise<Thread[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("chat_threads")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch threads: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get a specific thread
   */
  async getThread(threadId: string, userId: string): Promise<Thread | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("chat_threads")
      .select("*")
      .eq("id", threadId)
      .eq("user_id", userId)
      .single();

    if (error) {
      return null;
    }

    return data;
  }

  /**
   * Create a new thread
   */
  async createThread(
    organizationId: string,
    userId: string,
    request: CreateThreadRequest
  ): Promise<Thread> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("chat_threads")
      .insert({
        organization_id: organizationId,
        user_id: userId,
        title: request.title || null,
        external_id: request.external_id || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create thread: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a thread
   */
  async updateThread(
    threadId: string,
    userId: string,
    request: UpdateThreadRequest
  ): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from("chat_threads")
      .update({
        title: request.title,
        is_archived: request.is_archived,
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to update thread: ${error.message}`);
    }
  }

  /**
   * Delete a thread
   */
  async deleteThread(threadId: string, userId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from("chat_threads")
      .delete()
      .eq("id", threadId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to delete thread: ${error.message}`);
    }
  }

  /**
   * Archive a thread
   */
  async archiveThread(threadId: string, userId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from("chat_threads")
      .update({ is_archived: true, updated_at: new Date().toISOString() })
      .eq("id", threadId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to archive thread: ${error.message}`);
    }
  }

  /**
   * Unarchive a thread
   */
  async unarchiveThread(threadId: string, userId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from("chat_threads")
      .update({ is_archived: false, updated_at: new Date().toISOString() })
      .eq("id", threadId)
      .eq("user_id", userId);

    if (error) {
      throw new Error(`Failed to unarchive thread: ${error.message}`);
    }
  }

  /**
   * Update thread title
   */
  async updateThreadTitle(threadId: string, userId: string, title: string): Promise<void> {
    const supabase = await createClient();

    await supabase
      .from("chat_threads")
      .update({
        title: title.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId)
      .eq("user_id", userId);
  }

  /**
   * List messages for a thread
   */
  async listMessages(threadId: string, userId: string): Promise<ThreadMessage[]> {
    const supabase = await createClient();

    // Verify thread ownership
    const thread = await this.getThread(threadId, userId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch messages: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create a message
   */
  async createMessage(
    threadId: string,
    userId: string,
    request: CreateMessageRequest
  ): Promise<ThreadMessage> {
    const supabase = await createClient();

    // Verify thread ownership
    const thread = await this.getThread(threadId, userId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        thread_id: threadId,
        role: request.role,
        content: request.content,
        metadata: request.metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }

    return data;
  }
}

export const threadRepository = new ThreadRepository();
