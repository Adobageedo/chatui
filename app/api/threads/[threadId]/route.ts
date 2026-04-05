import { threadService } from "@/service/api/threads/thread.service";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { NextResponse } from "next/server";
import { ApiError } from "@/service/api/shared/api-error";

/**
 * GET /api/threads/[threadId]
 * Thin controller - delegates to ThreadService
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const auth = await AuthMiddleware.verifyAuth();
    const { threadId } = await params;

    const result = await threadService.getThread(threadId, auth.userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Get thread error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * PATCH /api/threads/[threadId]
 * Thin controller - delegates to ThreadService
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const auth = await AuthMiddleware.verifyAuth();
    const { threadId } = await params;
    const body = await req.json();

    await threadService.updateThread(threadId, auth.userId, body);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update thread error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * DELETE /api/threads/[threadId]
 * Thin controller - delegates to ThreadService
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const auth = await AuthMiddleware.verifyAuth();
    const { threadId } = await params;

    await threadService.deleteThread(threadId, auth.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete thread error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
