import { NextRequest, NextResponse } from "next/server";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { fileRepository } from "@/service/api/files/file.repository";

/** GET /api/files/:id */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await AuthMiddleware.verifyAuth();
    const { id } = await params;
    const item = await fileRepository.getItem(id);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(item);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: message.includes("Authentication") ? 401 : 500 });
  }
}

/** PATCH /api/files/:id — rename, toggle star, update metadata, etc. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await AuthMiddleware.verifyAuth();
    const { id } = await params;
    const body = await req.json();

    // Check if locked (only allow star toggle on locked items)
    const existing = await fileRepository.getItem(id);
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.locked && body.name !== undefined) {
      return NextResponse.json({ error: "Item is locked" }, { status: 403 });
    }

    // Build update payload (only allowed fields)
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.starred !== undefined) updates.starred = body.starred;
    if (body.shared !== undefined) updates.shared = body.shared;
    if (body.metadata !== undefined) updates.metadata = body.metadata;

    const updated = await fileRepository.updateItem(id, updates);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid body";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

/** DELETE /api/files/:id */
export async function DELETE(
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
    if (existing.locked) {
      return NextResponse.json({ error: "Item is locked" }, { status: 403 });
    }

    await fileRepository.deleteItem(id);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: message.includes("Authentication") ? 401 : 500 });
  }
}
