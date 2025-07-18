import { NextRequest, NextResponse } from 'next/server';
import { isProfileNameAvailable } from '@/lib/firestore';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const body = await request.json();
    const { profileName } = body;

    if (!profileName) {
      return NextResponse.json({ error: 'Profile name is required' }, { status: 400 });
    }

    // Basic validation
    if (profileName.trim().length < 3) {
      return NextResponse.json(
        {
          available: false,
          error: 'Profile name must be at least 3 characters long',
        },
        { status: 400 },
      );
    }

    if (profileName.trim().length > 30) {
      return NextResponse.json(
        {
          available: false,
          error: 'Profile name must be 30 characters or less',
        },
        { status: 400 },
      );
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(profileName.trim())) {
      return NextResponse.json(
        {
          available: false,
          error: 'Profile name can only contain letters, numbers, hyphens, and underscores',
        },
        { status: 400 },
      );
    }

    // Check availability
    const isAvailable = await isProfileNameAvailable(profileName.trim(), userId);

    return NextResponse.json({
      available: isAvailable,
      profileName: profileName.trim(),
    });
  } catch (error) {
    console.error('Error checking profile name availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
