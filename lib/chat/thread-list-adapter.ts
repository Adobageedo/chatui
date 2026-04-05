import { ThreadProvider } from "@/components/assistant-ui/threadprovider";
import type { unstable_RemoteThreadListAdapter as RemoteThreadListAdapter } from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import { threadService } from "@/lib/api/thread.service";

/**
 * Thread List Adapter
 * Manages thread persistence using thread service
 */
export const threadListAdapter: RemoteThreadListAdapter = {
  /**
   * List all threads
   */
  async list() {
    const { threads } = await threadService.listThreads();
    
    return {
      threads: threads.map((thread) => ({
        remoteId: thread.id,
        externalId: thread.external_id ?? undefined,
        status: thread.is_archived ? ("archived" as const) : ("regular" as const),
        title: thread.title ?? undefined,
      })),
    };
  },

  /**
   * Initialize a new thread
   */
  async initialize(localId) {
    const result = await threadService.createThread(localId);
    return {
      remoteId: result.id,
      externalId: result.external_id,
    };
  },

  /**
   * Rename a thread
   */
  async rename(remoteId, title) {
    await threadService.updateThread(remoteId, { title });
  },

  /**
   * Archive a thread
   */
  async archive(remoteId) {
    await threadService.archiveThread(remoteId);
  },

  /**
   * Unarchive a thread
   */
  async unarchive(remoteId) {
    await threadService.unarchiveThread(remoteId);
  },

  /**
   * Delete a thread
   */
  async delete(remoteId) {
    await threadService.deleteThread(remoteId);
  },

  /**
   * Fetch thread details
   */
  async fetch(remoteId) {
    const thread = await threadService.getThread(remoteId);
    return {
      status: thread.is_archived ? ("archived" as const) : ("regular" as const),
      remoteId: thread.id,
      title: thread.title,
    };
  },

  /**
   * Generate thread title
   */
  async generateTitle(remoteId, messages) {
    return createAssistantStream(async (controller) => {
      const { title } = await threadService.generateTitle(remoteId, [...messages]);
      controller.appendText(title);
    });
  },
  unstable_Provider: ThreadProvider,
};
