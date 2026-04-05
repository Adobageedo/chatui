import { messageService } from "@/service/api/threads/message.service";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { NextResponse } from "next/server";
import { ApiError } from "@/service/api/shared/api-error";

/**
 * GET /api/threads/[threadId]/messages
 * Thin controller - delegates to MessageService
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const auth = await AuthMiddleware.verifyAuth();
    const { threadId } = await params;

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
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const auth = await AuthMiddleware.verifyAuth();
    const { threadId } = await params;
    const body = await req.json();

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
