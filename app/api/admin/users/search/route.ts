import { NextRequest, NextResponse } from 'next/server';
import { db } from '@lib/firestore';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { getUserByUid, getUser, isAdmin } from '@lib/firestore';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    // Try to get user by UID first, then by document ID
    let user = await getUserByUid(userId);
    if (!user) {
      // If not found by UID, try by document ID
      user = await getUser(userId);
    }

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const searchTerm = searchParams.get('q') || '';
    const includeGuests = searchParams.get('includeGuests') === 'true';
    const limitParam = searchParams.get('limit');
    const maxResults = limitParam ? parseInt(limitParam, 10) : 50;

    // Get all users
    const usersRef = collection(db, 'users');
    // Note: Firestore doesn't support != queries easily, so we'll filter in memory
    const usersSnapshot = await getDocs(query(usersRef, orderBy('createdAt', 'desc')));

    let users = [];
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      const userObj = {
        id: doc.id,
        name: userData.name || '',
        email: userData.email || '',
        role: userData.role || 'COMPETITOR',
        isGuest: userData.isGuest || false,
        guestEventId: userData.guestEventId || null,
        verificationStatus: userData.verificationStatus || 'PENDING',
        bodyweight: userData.bodyweight,
        dateOfBirth: userData.dateOfBirth,
        sex: userData.sex,
      };

      // Filter out guests if includeGuests is false
      if (!includeGuests && userObj.isGuest) {
        continue;
      }

      // Filter by search term if provided
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          userObj.name.toLowerCase().includes(searchLower) ||
          userObj.email.toLowerCase().includes(searchLower) ||
          userObj.id.toLowerCase().includes(searchLower);

        if (!matchesSearch) {
          continue;
        }
      }

      users.push(userObj);
    }

    // Limit results
    users = users.slice(0, maxResults);

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
