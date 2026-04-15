import { NextRequest, NextResponse } from "next/server";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { fileRepository } from "@/service/api/files/file.repository";
import type { FileItem } from "@/lib/files/types";

/**
 * GET /api/files
 * Returns { files: Record<string, FileItem>, rootIds: string[] }
 * Provisions root folders on first access.
 */
export async function GET() {
  try {
    const auth = await AuthMiddleware.verifyAuth();
    const orgId = await fileRepository.getUserOrganizationId(auth.userId);

    // Provision root folders if they don't exist yet
    await fileRepository.provisionRootFolders(auth.userId, orgId);

    // Get root folders
    const roots = await fileRepository.getRootFolders(auth.userId, orgId);
    const rootIds = roots.map((r) => r.id);

    // Provision locked sub-structure for org roots (e.g. leases)
    const registry = await fileRepository.getRootRegistry();
    for (const root of roots) {
      const reg = registry.find((r) => r.id === root.rootRegistryId);
      if (reg?.slug === "leases") {
        await fileRepository.provisionLeasesSubfolders(root.id, orgId, auth.userId);
      }
    }

    // Fetch all items under these roots
    const allItems = await fileRepository.getAllItemsUnderRoots(rootIds);

    // Build files map - include roots + all descendants
    const files: Record<string, FileItem> = {};
    
    // Add root folders to files map
    for (const root of roots) {
      files[root.id] = { ...root, children: [] };
    }
    
    // Add all descendants
    for (const item of allItems) {
      files[item.id] = { ...item, children: [] };
    }
    
    // Populate children arrays
    for (const item of allItems) {
      if (item.parentId && files[item.parentId]) {
        files[item.parentId].children = files[item.parentId].children ?? [];
        files[item.parentId].children!.push(item.id);
      }
    }

    return NextResponse.json({ files, rootIds });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    const status = message.includes("Authentication") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * POST /api/files — create a new file or folder
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await AuthMiddleware.verifyAuth();
    const orgId = await fileRepository.getUserOrganizationId(auth.userId);

    const body = await req.json();
    const { name, type, parentId, size, mimeType, metadata } = body;

    if (!name || !type || !parentId) {
      return NextResponse.json(
        { error: "name, type and parentId are required" },
        { status: 400 }
      );
    }

    // Resolve root context from the parent
    const parent = await fileRepository.getItem(parentId);
    if (!parent) {
      return NextResponse.json({ error: "Parent not found" }, { status: 404 });
    }

    const item = await fileRepository.createItem({
      name,
      type,
      parentId,
      rootFolderId: parent.rootFolderId!,
      rootRegistryId: parent.rootRegistryId!,
      scope: parent.scope!,
      organizationId: orgId,
      ownerId: auth.userId,
      size: size ?? undefined,
      mimeType: mimeType ?? undefined,
      metadata: metadata ?? undefined,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid request";
    const status = message.includes("Authentication") ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
