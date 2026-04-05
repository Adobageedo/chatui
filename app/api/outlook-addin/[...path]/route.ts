import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.xml': 'application/xml',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathArray } = await params;
    const path = pathArray.join('/');
    const filePath = join(process.cwd(), 'outlook-addin', path);

    // Security check: ensure the path is within outlook-addin directory
    const normalizedPath = join(process.cwd(), 'outlook-addin');
    if (!filePath.startsWith(normalizedPath)) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // Read file
    const fileContent = await readFile(filePath);
    
    // Determine content type
    const ext = path.substring(path.lastIndexOf('.'));
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error serving outlook-addin file:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
