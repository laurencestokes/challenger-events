import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firestore';
import { doc, writeBatch } from 'firebase/firestore';
import { getUserByUid, isAdmin } from '@/lib/firestore';

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userIds, action } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs array is required' }, { status: 400 });
    }

    if (!action || !['activate', 'suspend'].includes(action)) {
      return NextResponse.json(
        { error: 'Valid action is required (activate or suspend)' },
        { status: 400 },
      );
    }

    // Use batch write for better performance
    const batch = writeBatch(db);
    const newStatus = action === 'activate' ? 'ACTIVE' : 'SUSPENDED';

    // Update each user
    for (const userId of userIds) {
      const userDoc = doc(db, 'users', userId);
      batch.update(userDoc, { status: newStatus });
    }

    // Commit the batch
    await batch.commit();

    return NextResponse.json({
      message: `${userIds.length} user(s) ${action}d successfully`,
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
