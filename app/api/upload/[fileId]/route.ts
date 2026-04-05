import { NextResponse } from "next/server";
import { storageApiService } from "@/service/api/storage/storage.service";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { ApiError } from "@/service/api/shared/api-error";

/**
 * DELETE /api/upload/[fileId]
 * Thin controller - delegates to StorageApiService
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    // Verify authentication
    await AuthMiddleware.verifyAuth();

    const { fileId } = await params;

    // Delegate to service layer
    await storageApiService.deleteFile({
      filePath: decodeURIComponent(fileId),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete API error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
