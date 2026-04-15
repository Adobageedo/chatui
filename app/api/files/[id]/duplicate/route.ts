import { NextRequest, NextResponse } from "next/server";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { fileRepository } from "@/service/api/files/file.repository";

/** POST /api/files/:id/duplicate */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await AuthMiddleware.verifyAuth();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { targetParentId } = body;

    const existing = await fileRepository.getItem(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.locked) {
      return NextResponse.json({ error: "Item is locked" }, { status: 403 });
    }

    const dup = await fileRepository.duplicateItem(id, auth.userId, targetParentId);
    return NextResponse.json(dup, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
