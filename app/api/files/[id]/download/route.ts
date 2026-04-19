import { NextRequest, NextResponse } from "next/server";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { fileRepository } from "@/service/api/files/file.repository";
import { storageService } from "@/service/api/files/storage.service";

/** GET /api/files/:id/download — returns a signed download URL */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await AuthMiddleware.verifyAuth();
    const orgId = await fileRepository.getUserOrganizationId(auth.userId);
    const { id } = await params;

    const item = await fileRepository.getItem(id);
    if (!item) {
      console.error(`[download] Item ${id} not found in DB`);
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (item.type === "folder") {
      return NextResponse.json({ error: "Cannot download folders" }, { status: 400 });
    }

    // If the file has a storage path, generate a signed URL
    if (item.storageBucket && item.storagePath) {
      try {
        const url = await storageService.getSignedDownloadUrl({
          bucket: item.storageBucket,
          path: item.storagePath,
        });
        return NextResponse.json({ url });
      } catch (err) {
        console.error(`[download] Stored path failed — bucket: ${item.storageBucket}, path: ${item.storagePath}`, err);
      }
    } else {
      console.error(`[download] Item ${id} has no storageBucket/storagePath — bucket: ${item.storageBucket}, path: ${item.storagePath}`);
    }

    // Fallback: resolve location from item metadata
    const location = storageService.resolveLocation(item, auth.userId, orgId);
    console.error(`[download] Fallback location — bucket: ${location.bucket}, path: ${location.path}`);
    try {
      const url = await storageService.getSignedDownloadUrl(location);
      return NextResponse.json({ url });
    } catch (err) {
      console.error(`[download] Fallback also failed for item ${id}`, err);
      return NextResponse.json({ error: "File not available for download" }, { status: 404 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
