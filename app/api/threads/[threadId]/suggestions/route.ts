import { suggestionService } from "@/service/api/threads/suggestion.service";
import { NextResponse } from "next/server";
import { ApiError } from "@/service/api/shared/api-error";

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
    return NextResponse.json(result);
  } catch (error) {
    console.error("Generate suggestions error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
