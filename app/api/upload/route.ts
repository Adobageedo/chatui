import { NextResponse } from "next/server";
import { storageApiService } from "@/service/api/storage/storage.service";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { ApiError, ValidationError } from "@/service/api/shared/api-error";

// Route segment config for file uploads
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/upload
 * Thin controller - delegates to StorageApiService
 */
export async function POST(req: Request) {
  try {
    // Verify authentication
    const auth = await AuthMiddleware.verifyAuth();

    // Get file from form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw new ValidationError("No file provided");
    }

    // Delegate to service layer
    const result = await storageApiService.uploadFile({
      userId: auth.userId,
      file,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload API error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
