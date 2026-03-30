import { NextRequest, NextResponse } from 'next/server';
import { db, getUser } from '@lib/firestore';
import { collection, deleteDoc, doc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { getUserByUid, isAdmin } from '@lib/firestore';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
    const { role, status } = body;

    // Validate the target user exists
    const targetUserDoc = doc(db, 'users', id);

    // Update user fields
    const updateData: Record<string, string> = {};

    if (role) {
      updateData.role = role;
    }

    if (status) {
      updateData.status = status;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    await updateDoc(targetUserDoc, updateData);

    return NextResponse.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUserId = authHeader.split('Bearer ')[1];
    const adminUser = await getUserByUid(adminUserId);

    if (!adminUser || !isAdmin(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const targetUserId = id;

    // Verify the target user exists
    const targetUser = await getUser(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prevent self-deletion (check both document ID and UID)
    if (adminUser.id === targetUserId || adminUser.uid === targetUser.uid) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Clean up related data
    // 1. Delete participations
    const participationsRef = collection(db, 'participations');
    const participationQuery = query(participationsRef, where('userId', '==', targetUserId));
    const participationSnapshot = await getDocs(participationQuery);
    await Promise.all(participationSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)));

    // 2. Delete team memberships
    const teamMembersRef = collection(db, 'teamMembers');
    const teamMembersQuery = query(teamMembersRef, where('userId', '==', targetUserId));
    const teamMembersSnapshot = await getDocs(teamMembersQuery);
    await Promise.all(teamMembersSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)));

    // 3. Delete team invitations
    const teamInvitationsRef = collection(db, 'teamInvitations');
    const teamInvitationsQuery = query(teamInvitationsRef, where('userId', '==', targetUserId));
    const teamInvitationsSnapshot = await getDocs(teamInvitationsQuery);
    await Promise.all(
      teamInvitationsSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)),
    );

    // 4. Delete scores
    const scoresRef = collection(db, 'scores');
    const scoresQuery = query(scoresRef, where('userId', '==', targetUserId));
    const scoresSnapshot = await getDocs(scoresQuery);
    await Promise.all(scoresSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)));

    // 5. Delete the user document
    const userRef = doc(db, 'users', targetUserId);
    await deleteDoc(userRef);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
