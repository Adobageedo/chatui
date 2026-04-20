import { messageService } from "@/service/api/threads/message.service";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { NextResponse } from "next/server";
import { ApiError } from "@/service/api/shared/api-error";

/**
 * GET /api/threads/[threadId]/messages
 * Thin controller - delegates to MessageService
 * Supports optional auth for Outlook mode
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const auth = await AuthMiddleware.getAuthOrNull();
    const { threadId } = await params;

    // Return empty list if not authenticated (Outlook mode)
    if (!auth) {
      return NextResponse.json({ messages: [] });
    }

    const result = await messageService.listMessages(threadId, auth.userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("List messages error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/threads/[threadId]/messages
 * Thin controller - delegates to MessageService
 * Supports optional auth for Outlook mode (doesn't save messages)
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const auth = await AuthMiddleware.getAuthOrNull();
    const { threadId } = await params;
    const body = await req.json();

    // If not authenticated (Outlook mode), return temp message without saving
    if (!auth) {
      return NextResponse.json({
        id: `temp-msg-${Date.now()}`,
        ...body,
        created_at: new Date().toISOString(),
      });
    }

    const result = await messageService.createMessage(threadId, auth.userId, body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Create message error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
