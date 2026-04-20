"use client";

import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useAui,
  Suggestions,
  Tools,
  Interactables,
  useRemoteThreadListRuntime
} from "@assistant-ui/react";
import { appToolkit } from "@/lib/toolkit";
import { SUGGESTIONS_CONFIG } from "@/config";
import { ReasoningProvider } from "@/contexts/reasoning-context";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { useThreadHistoryAdapterV6 } from "@/lib/chat/thread-history-adapter-v6";
import { threadListAdapter } from "@/lib/chat/thread-list-adapter";

/**
 * Main Runtime Provider (AI SDK v6)
 * Uses useChatRuntime hook integrated with Vercel AI SDK v6
 * Features:
 * - Streaming chat with automatic tool execution
 * - Frontend tools via appToolkit
 * - Suggestions and reasoning support
 * - Token usage tracking via messageMetadata
 * - Message history persistence (withFormat pattern for UIMessage)
 * - Thread list management for sidebar
 * - Interactables for email and document editing
 */
export function MyRuntimeProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const aui = useAui({
    suggestions: Suggestions(SUGGESTIONS_CONFIG),
    tools: Tools({ toolkit: appToolkit }),
    // interactables: Interactables(),
  });

  const runtime = useRemoteThreadListRuntime({
    runtimeHook: () => {
      // Call history adapter inside runtimeHook where AUI context is available
      const historyAdapter = useThreadHistoryAdapterV6();
      
      return useChatRuntime({ 
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
        transport: new AssistantChatTransport({
          api: "/api/chat",
        }),
        adapters: {
          history: historyAdapter,
        },
      });
    },
    adapter: threadListAdapter,
  });

  return (
    <ReasoningProvider>
      <AssistantRuntimeProvider runtime={runtime} aui={aui}>
        {children}
      </AssistantRuntimeProvider>
    </ReasoningProvider>
  );
}
