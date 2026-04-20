import { openai } from "@ai-sdk/openai";
import { streamText, stepCountIs, tool, jsonSchema } from "ai";
import { APP_CONFIG } from '@/config';
import { ValidationError } from "../shared/api-error";
import type { ChatRequest, ChatStreamOptions } from "./chat.types";
import { convertAssistantUIToolsToAISDK } from "./tool-converter";

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
   * 
   * IMPORTANT: These backend tools DON'T execute here!
   * They ONLY tell the AI model which tools exist.
   * 
   * Flow:
   * 1. Backend defines getTodayDate → Model knows it exists
   * 2. Model generates tool-call part → Sent to frontend
   * 3. Frontend LocalRuntime sees tool-call → Executes frontend tool.execute()
   * 4. Frontend renders → Uses frontend tool.render()
   * 
   * The backend execute() function is ONLY called if you use AI SDK's
   * automatic tool execution (which we DON'T). LocalRuntime handles it.
   */
  private getTools(): Record<string, any> {
    return {
      // AI SDK v6 uses `inputSchema` with `jsonSchema()` wrapper
      // Tools only inform the model - LocalRuntime executes on frontend
      getTodayDate: tool({
        description: "Get the current date and time",
        inputSchema: jsonSchema({
          type: "object",
          properties: {
            format: {
              type: "string",
              enum: ["iso", "readable", "date-only", "time-only"],
              description: "Date format to return",
            },
            timezone: {
              type: "string",
              description: "Timezone (e.g., 'UTC', 'America/New_York')",
            },
          },
          additionalProperties: false,
        } as any),
      } as any),
      get_current_weather: tool({
        description: "Get the current weather in a given city",
        inputSchema: jsonSchema({
          type: "object",
          properties: {
            city: {
              type: "string",
              description: "The city name",
            },
          },
          required: ["city"],
          additionalProperties: false,
        } as any),
      } as any),
    };
  }

  /**
   * Stream chat completion
   */
  async streamChat(request: ChatRequest, options: ChatStreamOptions = {}) {
    this.validateRequest(request);

    const aiMessages = this.convertMessages(request.messages, options.emailContext);
    
    // Determine which tools to use
    let tools: Record<string, any> = {};
    
    if (options.frontendTools) {
      console.log('[ChatService] Frontend tools received:', Object.keys(options.frontendTools));
      
      // Attempt to convert frontend tools
      const convertedTools = convertAssistantUIToolsToAISDK(options.frontendTools);
      
      if (convertedTools && Object.keys(convertedTools).length > 0) {
        console.log('[ChatService] ✓ Using converted frontend tools');
        tools = convertedTools;
      } else {
        console.log('[ChatService] ⚠ Frontend tool conversion failed, using matching backend tools');
        // Use only backend tools that match frontend tool names
        const frontendToolNames = Object.keys(options.frontendTools);
        const allBackendTools = this.getTools();
        
        for (const toolName of frontendToolNames) {
          if (allBackendTools[toolName]) {
            tools[toolName] = allBackendTools[toolName];
            console.log(`[ChatService] → Enabled backend tool: ${toolName}`);
          } else {
            console.log(`[ChatService] ⚠ No backend tool found for: ${toolName}`);
          }
        }
      }
    } else {
      console.log('[ChatService] No frontend tools provided, using all backend tools');
      tools = this.getTools();
    }
    
    console.log('[ChatService] Final tools being sent to model:', Object.keys(tools));
    console.log('[ChatService] Tool details:', JSON.stringify(tools, null, 2));
    
    // Use reasoning model (o1-mini) when reasoning is enabled
    // Otherwise use the default or specified model
    const model = options.reasoningEnabled 
      ? "gpt-5-nano" 
      : (options.model || this.defaultModel);

    // Only include tools if we have valid ones and not using reasoning mode
    const hasTools = Object.keys(tools).length > 0;
    const shouldIncludeTools = !options.reasoningEnabled && hasTools;

    console.log('[ChatService] Model:', model, 'Should include tools:', shouldIncludeTools);
    console.log('[ChatService] Tools object:', Object.keys(tools));

    // CRITICAL: Use .chat() to force Chat Completions API instead of Responses API
    // Pass tools in the tools parameter - AI SDK will handle serialization
    const result = streamText({
      model: openai.chat(model),
      messages: aiMessages,
      stopWhen: stepCountIs(options.maxSteps || this.maxSteps),
      temperature: options.temperature,
      // Pass tools directly - AI SDK expects Record<string, Tool>
      ...(shouldIncludeTools ? { tools } : {}),
      // Add reasoning-specific provider options
      ...(options.reasoningEnabled ? {
        providerOptions: {
          openai: {
            reasoningEffort: "low",
            reasoningSummary: "auto",
          },
        },
      } : {}),
      onFinish: (event) => {
        console.log('[ChatService] Stream finished, tool calls:', event.toolCalls?.length || 0);
      },
    });

    return result.toUIMessageStreamResponse({
      ...(options.reasoningEnabled ? { sendReasoning: true } : {}),
    });
  }
}

export const chatService = new ChatService();
