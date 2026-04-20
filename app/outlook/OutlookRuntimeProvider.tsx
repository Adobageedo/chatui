"use client";

import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useAui,
  Suggestions,
  Tools,
  useRemoteThreadListRuntime
} from "@assistant-ui/react";
import { outlookToolkit } from "@/lib/outlook/outlook-toolkit";
import { SUGGESTIONS_CONFIG } from "@/config";
import { ReasoningProvider } from "@/contexts/reasoning-context";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { AssistantChatTransport } from "@assistant-ui/react-ai-sdk";
import { useThreadHistoryAdapterV6 } from "@/lib/chat/thread-history-adapter-v6";
import { threadListAdapter } from "@/lib/chat/thread-list-adapter";
import { useOutlookContext } from "@/hooks/use-outlook-context";

export function OutlookRuntimeProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { getSystemPrompt } = useOutlookContext();
  
  const aui = useAui({
    suggestions: Suggestions(SUGGESTIONS_CONFIG),
    tools: Tools({ toolkit: outlookToolkit }),
  });

  const runtime = useRemoteThreadListRuntime({
    runtimeHook: () => {
      const historyAdapter = useThreadHistoryAdapterV6();
      const systemPrompt = getSystemPrompt();
      
      return useChatRuntime({ 
        sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
        transport: new AssistantChatTransport({
          api: "/api/chat",
          body: systemPrompt ? { system: systemPrompt } : undefined,
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
