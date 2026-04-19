import { NextResponse } from "next/server";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { fileRepository } from "@/service/api/files/file.repository";

/**
 * POST /api/files/sync/trigger
 * Picks up all pending files and marks them as "processing".
 * TODO: This is the entry point for the real sync pipeline.
 * The external service should:
 *   1. Download file from Supabase Storage
 *   2. Extract text (pdf-parse, OCR, etc.)
 *   3. Chunk text
 *   4. Generate embeddings (OpenAI)
 *   5. Upsert to Qdrant
 *   6. Call back to PATCH /api/files/:id with updated sync_status
 */
export async function POST() {
  try {
    await AuthMiddleware.verifyAuth();

    const pendingItems = await fileRepository.getPendingSyncItems(50);

    if (pendingItems.length === 0) {
      return NextResponse.json({ message: "No pending items", processed: 0 });
    }

    // Mark all as "processing"
    const processed = [];
    for (const item of pendingItems) {
      await fileRepository.updateSyncStatus(item.id, "processing");
      processed.push(item.id);
    }

    // TODO: Call external sync pipeline for each file, e.g.:
    // await Promise.all(processed.map(id =>
    //   fetch(SYNC_PIPELINE_URL, { method: "POST", body: JSON.stringify({ fileId: id }) })
    // ));

    return NextResponse.json({
      message: `${processed.length} file(s) sent to pipeline`,
      processed: processed.length,
      fileIds: processed,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("Authentication") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
