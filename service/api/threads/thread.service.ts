import { threadRepository } from "./thread.repository";
import { ValidationError, NotFoundError } from "../shared/api-error";
import type {
  CreateThreadRequest,
  UpdateThreadRequest,
  ThreadListResponse,
  ThreadResponse,
  CreateThreadResponse,
} from "./thread.types";

/**
 * Thread Service Layer
 * Handles thread CRUD business logic
 */
export class ThreadService {
  /**
   * List all threads for a user
   */
  async listThreads(userId: string): Promise<ThreadListResponse> {
    const threads = await threadRepository.listThreads(userId);
    return { threads };
  }

  /**
   * Get a specific thread
   */
  async getThread(threadId: string, userId: string): Promise<ThreadResponse> {
    const thread = await threadRepository.getThread(threadId, userId);

    if (!thread) {
      throw new NotFoundError("Thread not found");
    }

    return {
      id: thread.id,
      title: thread.title,
      is_archived: thread.is_archived,
      status: thread.is_archived ? "archived" : "regular",
    };
  }

  /**
   * Create a new thread
   */
  async createThread(
    userId: string,
    request: CreateThreadRequest
  ): Promise<CreateThreadResponse> {
    // Get user's organization
    const organizationId = await threadRepository.getUserOrganizationId(userId);

    // Create thread
    const thread = await threadRepository.createThread(
      organizationId,
      userId,
      request
    );

    return {
      id: thread.id,
      external_id: thread.external_id,
    };
  }

  /**
   * Update a thread
   */
  async updateThread(
    threadId: string,
    userId: string,
    request: UpdateThreadRequest
  ): Promise<void> {
    await threadRepository.updateThread(threadId, userId, request);
  }

  /**
   * Delete a thread
   */
  async deleteThread(threadId: string, userId: string): Promise<void> {
    await threadRepository.deleteThread(threadId, userId);
  }

  /**
   * Archive a thread
   */
  async archiveThread(threadId: string, userId: string): Promise<void> {
    await threadRepository.archiveThread(threadId, userId);
  }

  /**
   * Unarchive a thread
   */
  async unarchiveThread(threadId: string, userId: string): Promise<void> {
    await threadRepository.unarchiveThread(threadId, userId);
  }
}

export const threadService = new ThreadService();
