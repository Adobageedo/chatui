import { NextResponse } from "next/server";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { fileRepository } from "@/service/api/files/file.repository";
import type { SyncStats } from "@/lib/files/types";

/**
 * GET /api/files/sync/stats
 * Returns aggregate sync statistics for the current user's files.
 * Currently returns mock data derived from file items.
 */
export async function GET() {
  try {
    const auth = await AuthMiddleware.verifyAuth();
    const orgId = await fileRepository.getUserOrganizationId(auth.userId);

    const roots = await fileRepository.getRootFolders(auth.userId, orgId);
    const rootIds = roots.map((r) => r.id);
    const allItems = await fileRepository.getAllItemsUnderRoots(rootIds);

    const files = allItems.filter((i) => i.type === "file");

    const stats: SyncStats = {
      totalFiles: files.length,
      synced: files.filter((f) => f.syncStatus === "synced").length,
      pending: files.filter((f) => f.syncStatus === "pending").length,
      processing: files.filter((f) => f.syncStatus === "processing").length,
      error: files.filter((f) => f.syncStatus === "error").length,
      totalChunks: files.reduce((acc, f) => acc + (f.chunkCount ?? 0), 0),
    };

    return NextResponse.json(stats);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("Authentication") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
