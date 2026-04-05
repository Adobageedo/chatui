import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { threadRepository } from "./thread.repository";
import type {
  GenerateSuggestionsRequest,
  GenerateTitleRequest,
  SuggestionsResponse,
  TitleResponse,
} from "./thread.types";

const DEFAULT_SUGGESTIONS = [
  "Can you explain that in more detail?",
  "What are the key takeaways?",
  "How can I apply this information?",
];

const ERROR_SUGGESTIONS = [
  "Tell me more about this topic",
  "Can you give me an example?",
  "What else should I know?",
];

/**
 * Suggestion Service Layer
 * Handles AI-powered suggestions and title generation
 */
export class SuggestionService {
  /**
   * Extract conversation context from messages
   */
  private extractConversationContext(
    messages: any[],
    count: number = 5
  ): string {
    return messages
      .slice(-count)
      .map((m: any) => {
        const role = m.role === "user" ? "User" : "Assistant";
        if (Array.isArray(m.content)) {
          const text = m.content
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join(" ");
          return `${role}: ${text}`;
        }
        return `${role}: ${m.content}`;
      })
      .join("\n");
  }

  /**
   * Parse suggestions from AI response
   */
  private parseSuggestions(suggestionsText: string): string[] {
    let suggestions: string[] = [];

    try {
      // Try to find JSON array in the response
      const jsonMatch = suggestionsText.match(/\[.*\]/s);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        suggestions = JSON.parse(suggestionsText.trim());
      }

      if (!Array.isArray(suggestions)) {
        throw new Error("Not an array");
      }

      // Filter out empty suggestions
      suggestions = suggestions.filter(
        (s) => typeof s === "string" && s.trim().length > 0
      );
    } catch (parseError) {
      // Fallback: try line-by-line extraction
      const lines = suggestionsText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => {
          // Remove common prefixes
          line = line.replace(/^["'\-\*\d\.\)]\s*/, "").replace(/["']$/, "");
          return line.length > 5 && line.length < 100;
        });

      suggestions = lines.slice(0, 3);
    }

    return suggestions;
  }

  /**
   * Generate follow-up suggestions based on conversation
   */
  async generateSuggestions(
    request: GenerateSuggestionsRequest
  ): Promise<SuggestionsResponse> {
    try {
      if (!request.messages || request.messages.length === 0) {
        return { suggestions: [] };
      }

      const conversationContext = this.extractConversationContext(
        request.messages
      );

      // Generate suggestions with AI
      const { text: suggestionsText } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: `Based on this conversation, generate exactly 3 helpful follow-up questions the user might want to ask.

Conversation:
${conversationContext}

Return ONLY a valid JSON array of 3 strings. Each string should be a concise question (5-12 words).
Format: ["Question 1?", "Question 2?", "Question 3?"]

JSON array:`,
        temperature: 0.7,
      });

      // Parse suggestions
      let suggestions = this.parseSuggestions(suggestionsText);

      // Ensure we have at least some suggestions
      if (suggestions.length === 0) {
        suggestions = DEFAULT_SUGGESTIONS;
      }

      return { suggestions: suggestions.slice(0, 3) };
    } catch (error) {
      console.error("Error generating suggestions:", error);
      return { suggestions: ERROR_SUGGESTIONS };
    }
  }

  /**
   * Generate title for a thread based on messages
   */
  async generateTitle(
    threadId: string,
    userId: string,
    request: GenerateTitleRequest
  ): Promise<TitleResponse> {
    // Verify thread ownership
    const thread = await threadRepository.getThread(threadId, userId);
    if (!thread) {
      throw new Error("Thread not found");
    }

    // Extract conversation context from first messages
    const conversationContext = request.messages
      .slice(0, 3)
      .map((m: any) => {
        if (Array.isArray(m.content)) {
          return m.content
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join(" ");
        }
        return m.content;
      })
      .join("\n");

    // Generate title with AI
    const { text: title } = await generateText({
      model: openai("gpt-4o-mini"),
      prompt: `Generate a short, concise title (max 6 words) for this conversation. Only return the title, nothing else.

Conversation:
${conversationContext}

Title:`,
    });

    // Update thread title
    await threadRepository.updateThreadTitle(threadId, userId, title.trim());

    return { title: title.trim() };
  }
}

export const suggestionService = new SuggestionService();
