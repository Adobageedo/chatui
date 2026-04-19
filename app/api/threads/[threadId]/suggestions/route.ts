import { suggestionService } from "@/service/api/threads/suggestion.service";
import { NextResponse } from "next/server";
import { ApiError } from "@/service/api/shared/api-error";
import { handleCors, corsHeaders } from "@/lib/api/cors";

/**
 * OPTIONS /api/threads/[threadId]/suggestions
 * Handle CORS preflight
 */
export async function OPTIONS(request: Request) {
  return handleCors(request) || new Response(null, { status: 200 });
}

/**
 * POST /api/threads/[threadId]/suggestions
 * Thin controller - delegates to SuggestionService
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const body = await req.json();

    const result = await suggestionService.generateSuggestions(body);
    const response = NextResponse.json(result);
    
    const origin = req.headers.get("origin");
    Object.entries(corsHeaders(origin)).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    return response;
  } catch (error) {
    console.error("Generate suggestions error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
