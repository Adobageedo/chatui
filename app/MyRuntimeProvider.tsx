"use client";

import type { ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  useRemoteThreadListRuntime,
  useAui,
  useLocalRuntime,
  Suggestions,
} from "@assistant-ui/react";
import { threadListAdapter } from "@/lib/chat/thread-list-adapter";
import { chatModelAdapter } from "@/lib/chat/chat-model-adapter";
import { attachmentAdapter } from "@/lib/chat/attachment-adapter";
import { speechAdapter, isSpeechSynthesisSupported } from "@/lib/chat/speech-adapter";
import { SUGGESTIONS_CONFIG } from "@/config";
import { ReasoningProvider } from "@/contexts/reasoning-context";

/**
 * Main Runtime Provider
 * Provides LocalRuntime with all adapters:
 * - Chat model adapter (streaming + tool calls)
 * - Attachment adapter (file uploads)
 * - Speech synthesis adapter (text-to-speech)
 * - History adapter (message persistence via ThreadProvider)
 * - Suggestion adapter (follow-up suggestions via ThreadProvider)
 * - Thread list adapter (multi-thread management in Supabase)
 */
export function MyRuntimeProvider({
  children,
}: Readonly<{ children: ReactNode }>) {
    const aui = useAui({
    suggestions: Suggestions(SUGGESTIONS_CONFIG),
  });

  const runtime = useRemoteThreadListRuntime({
    runtimeHook: () => {
      return useLocalRuntime(chatModelAdapter, {
        adapters: {
          attachments: attachmentAdapter,
          // Only add speech adapter if browser supports it
          ...(typeof window !== "undefined" && isSpeechSynthesisSupported()
            ? { speech: speechAdapter }
            : {}),
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
