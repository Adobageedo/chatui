import { threadRepository } from "./thread.repository";
import { ValidationError } from "../shared/api-error";
import type {
  CreateMessageRequest,
  MessageListResponse,
  ThreadMessage,
} from "./thread.types";

const VALID_ROLES = ["user", "assistant", "system", "tool"] as const;

/**
 * Message Service Layer
 * Handles message business logic
 */
export class MessageService {
  /**
   * Validate message request
   */
  private validateMessage(request: CreateMessageRequest): void {
    if (!request.role || !request.content) {
      throw new ValidationError("Role and content are required");
    }

    if (!VALID_ROLES.includes(request.role)) {
      throw new ValidationError(
        `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}`
      );
    }
  }

  /**
   * List messages for a thread
   */
  async listMessages(
    threadId: string,
    userId: string
  ): Promise<MessageListResponse> {
    const messages = await threadRepository.listMessages(threadId, userId);
    return { messages };
  }

  /**
   * Create a message
   */
  async createMessage(
    threadId: string,
    userId: string,
    request: CreateMessageRequest
  ): Promise<{ message: ThreadMessage }> {
    this.validateMessage(request);

    const message = await threadRepository.createMessage(
      threadId,
      userId,
      request
    );

    return { message };
  }
}

export const messageService = new MessageService();
