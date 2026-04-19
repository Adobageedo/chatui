import { NextRequest, NextResponse } from "next/server";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { fileRepository } from "@/service/api/files/file.repository";

/**
 * POST /api/files/:id/resync
 * Sets file sync_status to "pending" so the pipeline picks it up.
 * TODO: Call the external sync API here once it exists.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await AuthMiddleware.verifyAuth();
    const { id } = await params;

    const existing = await fileRepository.getItem(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.type === "folder") {
      return NextResponse.json({ error: "Cannot resync a folder" }, { status: 400 });
    }

    // Set to pending — the pipeline will pick it up
    const updated = await fileRepository.updateSyncStatus(id, "pending", {
      syncError: null,
    });

    // TODO: Call external sync API here, e.g.:
    // await fetch(SYNC_PIPELINE_URL, { method: "POST", body: JSON.stringify({ fileId: id }) });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
