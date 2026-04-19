import { suggestionService } from "@/service/api/threads/suggestion.service";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { NextResponse } from "next/server";
import { ApiError } from "@/service/api/shared/api-error";
import { handleCors, corsHeaders } from "@/lib/api/cors";

/**
 * OPTIONS /api/threads/[threadId]/title
 * Handle CORS preflight
 */
export async function OPTIONS(request: Request) {
  return handleCors(request) || new Response(null, { status: 200 });
}

/**
 * POST /api/threads/[threadId]/title
 * Thin controller - delegates to SuggestionService
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const auth = await AuthMiddleware.verifyAuth();
    const { threadId } = await params;
    const body = await req.json();

    const result = await suggestionService.generateTitle(threadId, auth.userId, body);
    const response = NextResponse.json(result);
    
    const origin = req.headers.get("origin");
    Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    console.error("Generate title error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
