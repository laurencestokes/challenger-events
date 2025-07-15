import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, updateUserWithReverificationCheck } from '@/lib/firestore';

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
    } = body;

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
      updatedAt: new Date(),
    };

    // Update user profile with re-verification check
    // Use the document ID (user.id) instead of the uid (userId)
    await updateUserWithReverificationCheck(user.id, updates);

    // Get the updated user data
    const updatedUser = await getUserByUid(userId);
    // Trigger on-demand revalidation for the user's public profile page
    if (updatedUser) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        await fetch(`${baseUrl}/api/revalidate/profile/${updatedUser.uid}`, {
          method: 'POST',
          headers: {
            'x-revalidate-secret': process.env.REVALIDATE_SECRET || '',
          },
        });
      } catch (err) {
        console.error('Failed to revalidate public profile page:', err);
      }
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
