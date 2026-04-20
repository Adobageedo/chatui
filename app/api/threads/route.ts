import { threadService } from "@/service/api/threads/thread.service";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { NextResponse } from "next/server";
import { ApiError } from "@/service/api/shared/api-error";

/**
 * GET /api/threads
 * Thin controller - delegates to ThreadService
 * Supports optional auth for Outlook mode
 */
export async function GET() {
  try {
    const auth = await AuthMiddleware.getAuthOrNull();
    
    // Return empty list if not authenticated (Outlook mode without login)
    if (!auth) {
      return NextResponse.json({ threads: [] });
    }
    
    const result = await threadService.listThreads(auth.userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("List threads error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * POST /api/threads
 * Thin controller - delegates to ThreadService
 * Supports optional auth for Outlook mode (creates temporary thread without saving)
 */
export async function POST(req: Request) {
  try {
    const auth = await AuthMiddleware.getAuthOrNull();
    const body = await req.json();

    // If not authenticated (Outlook mode), return temporary thread without saving
    if (!auth) {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      return NextResponse.json({
        id: tempId,
        external_id: body.externalId || tempId,
      });
    }

    const result = await threadService.createThread(auth.userId, body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Create thread error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
