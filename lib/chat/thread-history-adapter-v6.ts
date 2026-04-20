"use client";

import { useMemo } from "react";
import { useAui } from "@assistant-ui/react";
import type { ThreadHistoryAdapter } from "@assistant-ui/react";
import { threadService } from "@/lib/api/thread.service";

/**
 * Thread History Adapter Hook for AI SDK v6
 * Implements withFormat for UIMessage persistence
 * Uses useAui to get current thread from thread list
 */
export function useThreadHistoryAdapterV6(): ThreadHistoryAdapter {
  const aui = useAui();

  return useMemo<ThreadHistoryAdapter>(
    () => ({
      async load() {
        return { messages: [] };
      },
      
      async append() {},

      withFormat: (fmt) => ({
        async load() {
          try {
            const { remoteId } = aui.threadListItem().getState();
            
            if (!remoteId) {
              return { messages: [] };
            }

            const { messages } = await threadService.getMessages(remoteId);

            if (!messages || messages.length === 0) {
              return { messages: [] };
            }

            const filteredMessages = messages.filter((row: any) => row.content && typeof row.content === 'object');

            const decodedMessages = filteredMessages.map((row: any) => {
                const storageEntry = row.content as any;
                return fmt.decode({
                  id: storageEntry.id || row.id,
                  parent_id: storageEntry.parent_id || null,
                  format: storageEntry.format || fmt.format,
                  content: storageEntry.content,
                });
              });
            
            return { messages: decodedMessages };
          } catch (error) {
            console.error("Error loading messages:", error);
            return { messages: [] };
          }
        },

        async append(item) {
          try {
            const { remoteId } = aui.threadListItem().getState();
            
            if (!remoteId) {
              return;
            }
            
            const messageId = fmt.getId(item.message);
            const encodedContent = fmt.encode(item);

            const storageEntry = {
              id: messageId,
              parent_id: item.parentId || null,
              format: fmt.format,
              content: encodedContent,
            };

            await threadService.addMessage(remoteId, {
              role: "assistant",
              content: storageEntry,
            });
          } catch (error) {
            console.error("Error appending message:", error);
          }
        },
      }),
    }),
    [aui],
  );
}
