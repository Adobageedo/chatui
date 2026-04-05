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
   * Build system prompt with email context
   */
  private buildEmailSystemPrompt(emailContext: any): string {
    const parts: string[] = [
      "You are an AI assistant helping with email composition and management.",
      "\n## Current Email Context:",
    ];

    if (emailContext.subject) {
      parts.push(`**Subject:** ${emailContext.subject}`);
    }
    if (emailContext.from) {
      parts.push(`**From:** ${emailContext.from}`);
    }
    if (emailContext.to) {
      parts.push(`**To:** ${emailContext.to}`);
    }
    if (emailContext.cc) {
      parts.push(`**CC:** ${emailContext.cc}`);
    }
    if (emailContext.date) {
      parts.push(`**Date:** ${new Date(emailContext.date).toLocaleString()}`);
    }
    if (emailContext.body) {
      parts.push(`\n**Email Body:**\n${emailContext.body}`);
    }
    if (emailContext.fullConversation) {
      parts.push(`\n**Full Conversation:**\n${emailContext.fullConversation}`);
    }

    parts.push(
      "\n---",
      "Use this email context to help the user compose replies, analyze the email, or perform related tasks."
    );

    return parts.join("\n");
  }

  /**
   * Convert assistant-ui messages to AI SDK format
   */
  private convertMessages(messages: ChatRequest["messages"], emailContext?: any) {
    const convertedMessages = messages.map((msg) => {
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

    // Inject email context as system message if present
    if (emailContext && Object.keys(emailContext).length > 0) {
      const systemPrompt = this.buildEmailSystemPrompt(emailContext);
      convertedMessages.unshift({
        role: "system",
        content: systemPrompt,
      });
    }

    return convertedMessages;
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

    const aiMessages = this.convertMessages(request.messages, options.emailContext);
    
    // Use reasoning model (o1-mini) when reasoning is enabled
    // Otherwise use the default or specified model
    const model = options.reasoningEnabled 
      ? "gpt-5-nano" 
      : (options.model || this.defaultModel);

    const result = streamText({
      model: openai(model),
      messages: aiMessages,
      stopWhen: stepCountIs(options.maxSteps || this.maxSteps),
      temperature: options.temperature,
      // Note: o1 models don't support tools, so only include if not using reasoning
      ...(options.reasoningEnabled ? {} : { tools: this.getTools() }),
      // Add reasoning-specific provider options
      ...(options.reasoningEnabled ? {
        providerOptions: {
          openai: {
            reasoningEffort: "low",
            reasoningSummary: "auto",
          },
        },
      } : {}),
    });

    return result.toUIMessageStreamResponse({
      ...(options.reasoningEnabled ? { sendReasoning: true } : {}),
    });
  }
}

export const chatService = new ChatService();
