import { threadService } from "@/service/api/threads/thread.service";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { NextResponse } from "next/server";
import { ApiError } from "@/service/api/shared/api-error";
import { handleCors, corsHeaders } from "@/lib/api/cors";

/**
 * OPTIONS /api/threads/[threadId]/archive
 * Handle CORS preflight
 */
export async function OPTIONS(request: Request) {
  return handleCors(request) || new Response(null, { status: 200 });
}

/**
 * POST /api/threads/[threadId]/archive
 * Thin controller - delegates to ThreadService
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const auth = await AuthMiddleware.verifyAuth();
    const { threadId } = await params;

    await threadService.archiveThread(threadId, auth.userId);
    const response = NextResponse.json({ success: true });
    
    const origin = req.headers.get("origin");
    Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    console.error("Archive thread error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
