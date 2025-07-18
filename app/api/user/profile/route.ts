import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  updateUserWithReverificationCheck,
  isProfileNameAvailable,
} from '@/lib/firestore';

export async function GET(request: NextRequest) {
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

    return NextResponse.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const {
      name,
      bodyweight,
      dateOfBirth,
      sex,
      publicProfileEnabled,
      publicProfileShowAge,
      publicProfileShowBodyweight,
      publicProfileShowSex,
      profileName,
    } = body;

    // Validate profile name if provided
    if (profileName !== undefined) {
      // Profile name validation rules
      if (profileName && profileName.trim().length < 3) {
        return NextResponse.json(
          { error: 'Profile name must be at least 3 characters long' },
          { status: 400 },
        );
      }

      if (profileName && profileName.trim().length > 30) {
        return NextResponse.json(
          { error: 'Profile name must be 30 characters or less' },
          { status: 400 },
        );
      }

      if (profileName && !/^[a-zA-Z0-9_-]+$/.test(profileName.trim())) {
        return NextResponse.json(
          { error: 'Profile name can only contain letters, numbers, hyphens, and underscores' },
          { status: 400 },
        );
      }

      // Check if profile name is available (if not empty)
      if (profileName && profileName.trim()) {
        const isAvailable = await isProfileNameAvailable(profileName.trim(), user.id);
        if (!isAvailable) {
          return NextResponse.json({ error: 'Profile name is already taken' }, { status: 400 });
        }
      }
    }

    // Convert dateOfBirth string to Date object if provided
    let processedDateOfBirth: Date | undefined;
    if (dateOfBirth) {
      try {
        processedDateOfBirth = new Date(dateOfBirth);
        // Validate the date
        if (isNaN(processedDateOfBirth.getTime())) {
          return NextResponse.json({ error: 'Invalid date format' }, { status: 400 });
        }
      } catch (error) {
        return NextResponse.json({ error: 'Invalid date format', details: error }, { status: 400 });
      }
    }

    const updates = {
      name: name || user.name,
      bodyweight: bodyweight !== undefined ? bodyweight : user.bodyweight,
      dateOfBirth: processedDateOfBirth || user.dateOfBirth,
      sex: sex !== undefined ? sex : user.sex,
      publicProfileEnabled,
      publicProfileShowAge,
      publicProfileShowBodyweight,
      publicProfileShowSex,
      profileName: profileName !== undefined ? profileName.trim() || null : user.profileName,
      updatedAt: new Date(),
    };

    // Update user profile with re-verification check
    // Use the document ID (user.id) instead of the uid (userId)
    await updateUserWithReverificationCheck(user.id, updates);

    // Get the updated user data
    const updatedUser = await getUserByUid(userId);
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
