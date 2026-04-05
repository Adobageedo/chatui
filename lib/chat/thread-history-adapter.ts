"use client";

import { useMemo } from "react";
import { useAui } from "@assistant-ui/react";
import type { ThreadHistoryAdapter } from "@assistant-ui/react";
import { threadService } from "@/lib/api/thread.service";

/**
 * Thread History Adapter Hook
 * Manages message persistence using thread service
 */
export function useThreadHistoryAdapter(): ThreadHistoryAdapter {
  const aui = useAui();

  return useMemo<ThreadHistoryAdapter>(
    () => ({
      /**
       * Load messages from database
       */
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

          // Convert to { parentId, message } wrapper format expected by useLocalRuntime
          return {
            messages: messages.map((msg: any, index: number) => {
              const messageId = String(msg.metadata?.messageId || msg.id);
              const prevMessageId = index > 0 
                ? String(messages[index - 1].metadata?.messageId || messages[index - 1].id)
                : null;
              
              return {
                parentId: prevMessageId,
                message: {
                  id: messageId,
                  role: msg.role,
                  content: Array.isArray(msg.content) 
                    ? msg.content
                    : [{ type: "text", text: String(msg.content) }],
                  createdAt: new Date(msg.created_at),
                  attachments: [],
                  ...(msg.role === "assistant" && {
                    status: { type: "complete" as const, reason: "unknown" as const },
                  }),
                  metadata: {
                    ...(msg.metadata || {}),
                    custom: {},
                  },
                },
              };
            }),
          };
        } catch (error) {
          console.error("Error loading messages:", error);
          return { messages: [] };
        }
      },

      /**
       * Append message to thread
       */
      async append(message: any) {
        try {
          const wrapper = message as any;
          const messageData = wrapper?.message ?? message;

          // Skip messages with empty content (called before stream completes)
          if (
            !messageData?.content ||
            (Array.isArray(messageData.content) && messageData.content.length === 0)
          ) {
            return;
          }

          const { remoteId } = await aui.threadListItem().initialize();

          const validRoles = ["user", "assistant", "system", "tool"];
          if (!messageData?.role || !validRoles.includes(messageData.role)) {
            return;
          }

          await threadService.addMessage(remoteId, {
            role: messageData.role,
            content: messageData.content,
          });
        } catch (error) {
          console.error("Error appending message:", error);
        }
      },
    }),
    [aui],
  );
}
