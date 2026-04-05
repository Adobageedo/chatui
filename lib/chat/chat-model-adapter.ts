import type { ChatModelAdapter } from "@assistant-ui/react";
import { API_ROUTES } from '@/config';

/**
 * Chat Model Adapter for LocalRuntime
 * Handles streaming responses with tool calls from /api/chat endpoint
 * 
 * Features:
 * - Streaming text responses
 * - Tool call handling with proper state accumulation
 * - Error handling and abort signal support
 */
export const chatModelAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const response = await fetch(API_ROUTES.chat, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
      signal: abortSignal,
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let currentText = "";
    
    // Store tool calls outside the loop to prevent UI flickering
    const toolCallsMap = new Map<
      string,
      {
        type: "tool-call";
        toolName: string;
        toolCallId: string;
        args: Record<string, unknown>;
      }
    >();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            let data;
            
            if (line.startsWith("0:")) {
              const json = line.slice(2);
              data = JSON.parse(json);
            } else if (line.startsWith("data: ")) {
              const json = line.slice(6);
              data = JSON.parse(json);
            } else {
              data = JSON.parse(line);
            }

            // Handle text deltas
            if (data.type === "text-delta" && data.delta) {
              currentText += data.delta;
            }

            // Handle tool calls - accumulate in map
            if (data.type === "tool-call" && data.toolCallId) {
              toolCallsMap.set(data.toolCallId, {
                type: "tool-call",
                toolName: data.toolName,
                toolCallId: data.toolCallId,
                args: data.args || {},
              });
            }

            // Handle tool results
            if (data.type === "tool-result" && data.toolCallId) {
              if (toolCallsMap.has(data.toolCallId)) {
                const existingCall = toolCallsMap.get(data.toolCallId)!;
                toolCallsMap.set(data.toolCallId, {
                  ...existingCall,
                });
              }
            }

            // Build content from accumulated state
            const content: any[] = [
              ...(currentText ? [{ type: "text", text: currentText }] : []),
              ...Array.from(toolCallsMap.values()),
            ];

            // Only yield if we have content
            if (content.length > 0) {
              yield { content };
            }
          } catch (e) {
            // Ignore unparseable lines (like "data: [DONE]")
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }
      throw error;
    } finally {
      reader.releaseLock();
    }
  },
};
