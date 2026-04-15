import { NextRequest, NextResponse } from "next/server";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { fileRepository } from "@/service/api/files/file.repository";

/** POST /api/files/:id/star — toggle star */
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

    const updated = await fileRepository.updateItem(id, {
      starred: !existing.starred,
    });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
