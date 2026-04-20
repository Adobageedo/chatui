import { threadService } from "@/service/api/threads/thread.service";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { NextResponse } from "next/server";
import { ApiError } from "@/service/api/shared/api-error";

/**
 * POST /api/threads/[threadId]/unarchive
 * Thin controller - delegates to ThreadService
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const auth = await AuthMiddleware.verifyAuth();
    const { threadId } = await params;

    await threadService.unarchiveThread(threadId, auth.userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unarchive thread error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
