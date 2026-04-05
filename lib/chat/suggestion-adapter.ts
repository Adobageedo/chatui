"use client";

import { useMemo } from "react";
import { useAui } from "@assistant-ui/react";
import type { SuggestionAdapter } from "@assistant-ui/react";
import { threadService } from "@/lib/api/thread.service";

/**
 * Suggestion Adapter Hook
 * Generates follow-up suggestions using thread service
 */
export function useSuggestionAdapter(): SuggestionAdapter {
  const aui = useAui();

  return useMemo<SuggestionAdapter>(
    () => ({
      /**
       * Generate suggestions based on conversation
       */
      async *generate({ messages }: { messages: readonly any[] }) {
        try {
          const { remoteId } = aui.threadListItem().getState();
          
          if (!remoteId) {
            console.log("📭 No remoteId, skipping suggestions");
            return;
          }

          console.log(`💡 Generating suggestions for thread ${remoteId}`);

          const lastMessage = messages[messages.length - 1];
          
          if (!lastMessage || messages.length === 0) {
            console.log("📭 No messages, skipping suggestions");
            return;
          }

          const { suggestions } = await threadService.generateSuggestions(
            remoteId,
            [...messages]
          );
          console.log(`✅ Generated ${suggestions?.length || 0} suggestions`);

          if (!suggestions || suggestions.length === 0) {
            return;
          }

          // Yield les suggestions au format attendu
          yield suggestions.map((prompt: string) => ({
            prompt,
          }));
        } catch (error) {
          console.error("❌ Error generating suggestions:", error);
        }
      },
    }),
    [aui]
  );
}
