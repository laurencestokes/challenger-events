import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firestore';
import { collection, getDocs, query, where, orderBy, addDoc } from 'firebase/firestore';
import { getUserByUid, getUser, isAdmin } from '@/lib/firestore';

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

    // Get all users
    const usersRef = collection(db, 'users');
    const allUsersQuery = query(usersRef, orderBy('createdAt', 'desc'));
    const allUsersSnapshot = await getDocs(allUsersQuery);

    const users = [];
    let totalUsers = 0;
    let activeUsers = 0;
    let pendingUsers = 0;
    const roleDistribution = {
      ADMIN: 0,
      COMPETITOR: 0,
      VIEWER: 0,
      SUPER_ADMIN: 0,
    };

    for (const doc of allUsersSnapshot.docs) {
      const userData = doc.data();
      const user = {
        id: doc.id,
        name: userData.name || '',
        email: userData.email,
        role: userData.role || 'COMPETITOR',
        createdAt: userData.createdAt,
        emailVerified: userData.emailVerified || false,
        lastLoginAt: userData.lastLoginAt,
        status: userData.status || 'ACTIVE',
        eventsJoined: userData.eventsJoined || 0,
        totalScore: userData.totalScore || 0,
      };

      users.push(user);
      totalUsers++;

      if (user.status === 'ACTIVE') activeUsers++;
      if (user.status === 'PENDING') pendingUsers++;

      roleDistribution[user.role as keyof typeof roleDistribution]++;
    }

    const stats = {
      totalUsers,
      activeUsers,
      pendingUsers,
      roleDistribution,
    };

    return NextResponse.json({ users, stats });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    // Define usersRef here
    const usersRef = collection(db, 'users');
    // Check if user already exists
    const existingUserQuery = query(usersRef, where('email', '==', email));
    const existingUserSnapshot = await getDocs(existingUserQuery);

    if (!existingUserSnapshot.empty) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // Create new user
    const newUser = {
      email,
      role,
      status: 'PENDING',
      emailVerified: false,
      createdAt: new Date(),
      eventsJoined: 0,
      totalScore: 0,
      invitedBy: user.email,
      invitedAt: new Date(),
    };

    // Add user to database
    await addDoc(collection(db, 'users'), newUser);

    return NextResponse.json({ message: 'User invited successfully' });
  } catch (error) {
    console.error('Error inviting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
