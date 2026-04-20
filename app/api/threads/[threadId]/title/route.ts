import { suggestionService } from "@/service/api/threads/suggestion.service";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { NextResponse } from "next/server";
import { ApiError } from "@/service/api/shared/api-error";

/**
 * POST /api/threads/[threadId]/title
 * Thin controller - delegates to SuggestionService
 * Supports optional auth for Outlook mode
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const auth = await AuthMiddleware.getAuthOrNull();
    const { threadId } = await params;
    const body = await req.json();

    // If not authenticated (Outlook mode), return generic title without saving
    if (!auth) {
      return NextResponse.json({ title: "Outlook Chat" });
    }

    const result = await suggestionService.generateTitle(threadId, auth.userId, body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate title error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
