import type { ChatModelAdapter } from "@assistant-ui/react";
import { API_ROUTES } from '@/config';

/**
 * Get reasoning mode from window context
 */
function getReasoningMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    // Access reasoning context from window
    return (window as any).__reasoningEnabled__ || false;
  } catch {
    return false;
  }
}

/**
 * Get email context from window
 */
function getEmailContext(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    return (window as any).__emailContext__ || null;
  } catch {
    return null;
  }
}

/**
 * Chat Model Adapter for LocalRuntime
 * Handles streaming responses with tool calls from /api/chat endpoint
 * 
 * Features:
 * - Streaming text responses
 * - Tool call handling with proper state accumulation
 * - Error handling and abort signal support
 * - Reasoning mode support (uses o1-mini when enabled)
 */
export const chatModelAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal, context }) {
    // Merge attachment content into message content
    const processedMessages = messages.map((msg: any) => {
      // Check if message has attachments with content
      if (msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0) {
        // Collect all attachment content
        const attachmentContents = msg.attachments
          .filter((att: any) => att.content && Array.isArray(att.content))
          .flatMap((att: any) => att.content);
        
        // Merge attachment content into message content
        const mergedContent = [...msg.content, ...attachmentContents];
        
        return {
          ...msg,
          content: mergedContent,
          // Remove attachments array to avoid duplication
          attachments: undefined,
        };
      }
      
      return msg;
    });
    
    const reasoningEnabled = getReasoningMode();
    const emailContext = getEmailContext();
    
    const response = await fetch(API_ROUTES.chat, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        messages: processedMessages,
        reasoningEnabled,
        emailContext,
        tools: context.tools, // Pass tools from context to backend
      }),
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
    let currentReasoning = "";
    let currentReasoningId = "";
    
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
            // Handle reasoning start
            if (data.type === "reasoning-start" && data.id) {
              currentReasoningId = data.id;
              currentReasoning = "";
            }

            // Handle reasoning deltas
            if (data.type === "reasoning-delta" && data.delta) {
              currentReasoning += data.delta;
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
              ...(currentReasoning ? [{ type: "reasoning", text: currentReasoning }] : []),
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
