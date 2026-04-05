import { openai } from "@ai-sdk/openai";
import { streamText, tool, stepCountIs, zodSchema } from "ai";
import { z } from "zod";
import { APP_CONFIG } from '@/config';
import { ValidationError } from "../shared/api-error";
import type { ChatRequest, ChatStreamOptions } from "./chat.types";

/**
 * Chat Service Layer
 * Handles AI chat streaming and tool execution
 */
export class ChatService {
  private readonly defaultModel = APP_CONFIG.ai.defaultModel;
  private readonly maxSteps = APP_CONFIG.ai.maxSteps;

  /**
   * Validate chat request
   */
  private validateRequest(request: ChatRequest): void {
    if (!request.messages || !Array.isArray(request.messages)) {
      throw new ValidationError("Invalid messages format");
    }

    if (request.messages.length === 0) {
      throw new ValidationError("Messages array cannot be empty");
    }
  }

  /**
   * Convert assistant-ui messages to AI SDK format
   */
  private convertMessages(messages: ChatRequest["messages"]) {
    return messages.map((msg) => {
      const content = msg.content || [];

      // Extract text content
      const textContent = content
        .filter((c) => c.type === "text")
        .map((c) => c.text)
        .join("\n");

      return {
        role: msg.role,
        content: textContent || "",
      };
    });
  }

  /**
   * Get tool definitions
   */
  private getTools() {
    return {
      get_current_weather: tool({
        description: "Get the current weather in a given city",
        inputSchema: zodSchema(
          z.object({
            city: z.string().describe("The city name"),
          })
        ),
        execute: async ({ city }) => {
          // In production, call a real weather API
          return {
            city,
            temperature: 72,
            condition: "sunny",
            humidity: 65,
          };
        },
      }),
    };
  }

  /**
   * Stream chat completion
   */
  async streamChat(request: ChatRequest, options: ChatStreamOptions = {}) {
    this.validateRequest(request);

    const aiMessages = this.convertMessages(request.messages);
    const model = options.model || this.defaultModel;

    const result = streamText({
      model: openai(model),
      messages: aiMessages,
      stopWhen: stepCountIs(options.maxSteps || this.maxSteps),
      temperature: options.temperature,
      tools: this.getTools(),
    });

    return result.toUIMessageStreamResponse();
  }
}

export const chatService = new ChatService();
