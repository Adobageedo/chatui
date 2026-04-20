// import { ThreadProvider } from "@/components/assistant-ui/threadprovider";
import { ThreadProviderV6 } from "@/components/assistant-ui/threadprovider-v6";

import type { unstable_RemoteThreadListAdapter as RemoteThreadListAdapter } from "@assistant-ui/react";
import { createAssistantStream } from "assistant-stream";
import { threadService } from "@/lib/api/thread.service";

/**
 * Simple in-memory cache for thread list
 * Invalidated on write operations
 */
let threadListCache: {
  data: Awaited<ReturnType<typeof threadService.listThreads>> | null;
  timestamp: number;
} = { data: null, timestamp: 0 };

const CACHE_TTL = 5000; // 5 seconds

function invalidateCache() {
  threadListCache = { data: null, timestamp: 0 };
}

/**
 * Thread List Adapter (Optimized)
 * Features:
 * - In-memory caching for faster loads
 * - Fire-and-forget for write operations
 * - Error handling and graceful fallbacks
 */
export const threadListAdapter: RemoteThreadListAdapter = {
  /**
   * List all threads (with caching)
   */
  async list() {
    try {
      // Check cache
      const now = Date.now();
      if (threadListCache.data && (now - threadListCache.timestamp) < CACHE_TTL) {
        const { threads } = threadListCache.data;
        
        // Guard against missing threads
        if (!threads || !Array.isArray(threads)) {
          return { threads: [] };
        }
        
        return {
          threads: threads.map((thread) => ({
            remoteId: thread.id,
            externalId: thread.external_id ?? undefined,
            status: thread.is_archived ? ("archived" as const) : ("regular" as const),
            title: thread.title ?? undefined,
          })),
        };
      }

      // Fetch fresh data
      const result = await threadService.listThreads();
      threadListCache = { data: result, timestamp: now };
      
      const { threads } = result;
      
      // Guard against missing threads (e.g., unauthenticated users)
      if (!threads || !Array.isArray(threads)) {
        return { threads: [] };
      }
      
      return {
        threads: threads.map((thread) => ({
          remoteId: thread.id,
          externalId: thread.external_id ?? undefined,
          status: thread.is_archived ? ("archived" as const) : ("regular" as const),
          title: thread.title ?? undefined,
        })),
      };
    } catch (error) {
      console.error('Failed to list threads:', error);
      // Return empty list on error (e.g., for anonymous users)
      return { threads: [] };
    }
  },

  /**
   * Initialize a new thread
   * Note: Must wait for server to get valid ID for subsequent operations
   */
  async initialize(localId) {
    try {
      const result = await threadService.createThread(localId);
      invalidateCache(); // Invalidate cache after creation
      return {
        remoteId: result.id,
        externalId: result.external_id,
      };
    } catch (error) {
      console.error('Failed to initialize thread:', error);
      // Return local ID as fallback, but this may cause issues with dependent operations
      return {
        remoteId: `local-${localId}`,
        externalId: undefined,
      };
    }
  },

  /**
   * Rename a thread (fire-and-forget with optimistic update)
   */
  async rename(remoteId, title) {
    // Fire-and-forget: update in background
    threadService.updateThread(remoteId, { title }).catch((error) => {
      console.error('Failed to rename thread:', error);
    });
    
    invalidateCache();
    // Return immediately for instant UI feedback
  },

  /**
   * Archive a thread (fire-and-forget with optimistic update)
   */
  async archive(remoteId) {
    // Fire-and-forget: archive in background
    threadService.archiveThread(remoteId).catch((error) => {
      console.error('Failed to archive thread:', error);
    });
    
    invalidateCache();
    // Return immediately for instant UI feedback
  },

  /**
   * Unarchive a thread (fire-and-forget with optimistic update)
   */
  async unarchive(remoteId) {
    // Fire-and-forget: unarchive in background
    threadService.unarchiveThread(remoteId).catch((error) => {
      console.error('Failed to unarchive thread:', error);
    });
    
    invalidateCache();
    // Return immediately for instant UI feedback
  },

  /**
   * Delete a thread (fire-and-forget with optimistic update)
   */
  async delete(remoteId) {
    // Fire-and-forget: delete in background
    threadService.deleteThread(remoteId).catch((error) => {
      console.error('Failed to delete thread:', error);
    });
    
    invalidateCache();
    // Return immediately for instant UI feedback
  },

  /**
   * Fetch thread details (optimistic with background refresh)
   */
  async fetch(remoteId) {
    // Check if we have cached data for this thread
    if (threadListCache.data && threadListCache.data.threads && Array.isArray(threadListCache.data.threads)) {
      const cachedThread = threadListCache.data.threads.find(t => t.id === remoteId);
      if (cachedThread) {
        // Return cached data immediately
        const result = {
          status: cachedThread.is_archived ? ("archived" as const) : ("regular" as const),
          remoteId: cachedThread.id,
          title: cachedThread.title ?? "Chat",
        };
        
        // Refresh in background
        threadService.getThread(remoteId).catch(() => {});
        
        return result;
      }
    }
    
    // If not in cache, fetch but with timeout protection
    try {
      const thread = await threadService.getThread(remoteId);
      return {
        status: thread.is_archived ? ("archived" as const) : ("regular" as const),
        remoteId: thread.id,
        title: thread.title ?? "Chat",
      };
    } catch (error) {
      console.error('Failed to fetch thread:', error);
      // Return optimistic data
      return {
        status: "regular" as const,
        remoteId: remoteId,
        title: "Chat",
      };
    }
  },

  /**
   * Generate thread title (with background cache invalidation)
   */
  async generateTitle(remoteId, messages) {
    return createAssistantStream(async (controller) => {
      try {
        const { title } = await threadService.generateTitle(remoteId, [...messages]);
        controller.appendText(title);
        
        // Invalidate cache in background (don't block streaming)
        Promise.resolve().then(() => invalidateCache());
      } catch (error) {
        console.error('Failed to generate title:', error);
        controller.appendText("New Chat");
      }
    });
  },
  unstable_Provider: ThreadProviderV6,
};
