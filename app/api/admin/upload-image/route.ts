import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, isAdmin } from '@/lib/firestore';
import path from 'path';
import { promises as fs } from 'fs';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'brief-images');

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    // Ensure upload directory exists
    await fs.mkdir(UPLOAD_DIR, { recursive: true });

    // Generate a unique filename
    const ext = path.extname(file.name) || '.' + file.type.split('/')[1];
    const base = path.basename(file.name, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${base}_${Date.now()}${ext}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Save file
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(filepath, Buffer.from(arrayBuffer));

    // Return public URL
    const publicUrl = `/brief-images/${filename}`;
    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Error uploading image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // List all files in the upload directory
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    const files = await fs.readdir(UPLOAD_DIR);
    const urls = files
      .filter((f) => /\.(png|jpe?g|gif|webp)$/i.test(f))
      .map((f) => `/brief-images/${f}`);
    return NextResponse.json({ images: urls });
  } catch (error) {
    console.error('Error listing images:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');
    if (!filename || /[\\/]/.test(filename)) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }
    const filepath = path.join(UPLOAD_DIR, filename);
    await fs.unlink(filepath);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
