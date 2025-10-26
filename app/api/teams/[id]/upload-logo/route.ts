import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, isAdmin, updateTeamLogo, getTeam } from '@/lib/firestore';
import { adminStorage } from '@/lib/firebase-admin';
import path from 'path';
import { promises as fs } from 'fs';

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'team-logos');

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only admins can upload team logos
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const teamId = params.id;

    // Check if team exists
    const team = await getTeam(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PNG, JPEG, JPG, GIF, and WEBP are allowed.' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `team-${teamId}-${Date.now()}.${ext}`;

    let publicUrl = '';
    let useFirebaseStorage = false;

    // Try Firebase Storage first, fall back to local storage
    if (adminStorage) {
      try {
        const bucket = adminStorage.bucket();
        const fileRef = bucket.file(`team-logos/${filename}`);

        // Upload file to Firebase Storage
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        await fileRef.save(buffer, {
          metadata: {
            contentType: file.type,
          },
        });

        // Make the file publicly accessible
        await fileRef.makePublic();

        // Get public URL
        publicUrl = `https://storage.googleapis.com/${bucket.name}/team-logos/${filename}`;
        useFirebaseStorage = true;
      } catch (storageError) {
        console.error('Firebase Storage upload failed:', storageError);
        useFirebaseStorage = false;
      }
    }

    // Fallback to local file storage
    if (!useFirebaseStorage || !publicUrl) {
      // Ensure upload directory exists
      await fs.mkdir(UPLOAD_DIR, { recursive: true });

      const filepath = path.join(UPLOAD_DIR, filename);

      // Save file
      const arrayBuffer = await file.arrayBuffer();
      await fs.writeFile(filepath, Buffer.from(arrayBuffer));

      // Return public URL
      publicUrl = `/team-logos/${filename}`;
    }

    // Ensure we have a URL
    if (!publicUrl) {
      return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 });
    }

    // Update team document with logo URL
    await updateTeamLogo(teamId, publicUrl);

    return NextResponse.json({
      message: 'Logo uploaded successfully',
      logoUrl: publicUrl,
    });
  } catch (error) {
    console.error('Error uploading team logo:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
