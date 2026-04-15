import { NextRequest, NextResponse } from "next/server";
import { AuthMiddleware } from "@/service/api/shared/auth.middleware";
import { fileRepository } from "@/service/api/files/file.repository";
import { storageService } from "@/service/api/files/storage.service";
import { MAX_FILE_SIZE } from "@/lib/files/upload-hierarchy";

/**
 * POST /api/files/upload
 * Accepts multipart form data with:
 *   - file: the actual file blob
 *   - parentId: target folder ID
 *   - metadata: optional JSON string of MetadataEntry[]
 *
 * 1. Resolves the storage bucket from the parent's root scope
 * 2. Uploads the blob to Supabase Storage
 * 3. Creates the DB record pointing to the stored file
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await AuthMiddleware.verifyAuth();
    const orgId = await fileRepository.getUserOrganizationId(auth.userId);

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const parentId = formData.get("parentId") as string | null;
    const metadataRaw = formData.get("metadata") as string | null;

    if (!file || !parentId) {
      return NextResponse.json(
        { error: "file and parentId are required" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024} MB limit` },
        { status: 413 }
      );
    }

    // Resolve parent context
    const parent = await fileRepository.getItem(parentId);
    if (!parent) {
      return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
    }

    const location = storageService.resolveLocation(
      { rootFolderId: parent.rootFolderId, scope: parent.scope } as Parameters<typeof storageService.resolveLocation>[0],
      auth.userId,
      orgId,
      `${Date.now()}-${file.name}`
    );

    // Upload to Supabase Storage
    const buffer = await file.arrayBuffer();
    await storageService.uploadFile(location, buffer, file.type);

    // Create DB record
    const metadata = metadataRaw ? JSON.parse(metadataRaw) : undefined;

    const item = await fileRepository.createItem({
      name: file.name,
      type: "file",
      parentId,
      rootFolderId: parent.rootFolderId!,
      rootRegistryId: parent.rootRegistryId!,
      scope: parent.scope!,
      organizationId: orgId,
      ownerId: auth.userId,
      size: file.size,
      mimeType: file.type,
      storageBucket: location.bucket,
      storagePath: location.path,
      metadata,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err: unknown) {
    console.error("Upload error:", err);
    const message = err instanceof Error ? err.message : "Upload failed";
    const status = message.includes("Authentication") ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
