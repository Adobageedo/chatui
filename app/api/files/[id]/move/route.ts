import { NextRequest, NextResponse } from "next/server";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { fileRepository } from "@/service/api/files/file.repository";

/** POST /api/files/:id/move  { targetFolderId: string } */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await AuthMiddleware.verifyAuth();
    const { id } = await params;
    const { targetFolderId } = await req.json();

    if (!targetFolderId) {
      return NextResponse.json({ error: "targetFolderId is required" }, { status: 400 });
    }

    const existing = await fileRepository.getItem(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.locked) {
      return NextResponse.json({ error: "Item is locked" }, { status: 403 });
    }

    const moved = await fileRepository.moveItem(id, targetFolderId);
    return NextResponse.json(moved);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid body";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
