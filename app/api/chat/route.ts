import { chatService } from "@/service/api/chat/chat.service";
import { ApiResponseBuilder } from "@/service/api/shared/api-response";
import { ApiError } from "@/service/api/shared/api-error";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";

export const maxDuration = 30;

/**
 * Chat endpoint for LocalRuntime
 * Thin controller - delegates to ChatService
 */
export async function POST(req: Request) {
  try {
    // Verify authentication
    await AuthMiddleware.verifyAuth();
    
    const { messages, reasoningEnabled = false, emailContext = null, tools =null } = await req.json();

    // Delegate to service layer
    return await chatService.streamChat(
      { messages, emailContext }, 
      { reasoningEnabled, emailContext, frontendTools: tools }
    );
  } catch (error) {
    console.error("Chat API error:", error);

    // Handle custom API errors
    if (error instanceof ApiError) {
      return ApiResponseBuilder.error(error.message, error.statusCode, error.details);
    }

    // Handle unexpected errors
    return ApiResponseBuilder.serverError(error);
  }
}
