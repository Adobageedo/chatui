import { threadService } from "@/service/api/threads/thread.service";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { NextResponse } from "next/server";
import { ApiError } from "@/service/api/shared/api-error";

/**
 * GET /api/threads
 * Thin controller - delegates to ThreadService
 */
export async function GET() {
  try {
    const auth = await AuthMiddleware.verifyAuth();
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
 */
export async function POST(req: Request) {
  try {
    const auth = await AuthMiddleware.verifyAuth();
    const body = await req.json();

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
