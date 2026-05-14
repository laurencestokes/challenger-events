import { NextRequest, NextResponse } from 'next/server';
import {
  db,
  getUser,
  getUserByUid,
  isAdmin,
  isProfileNameAvailable,
  isSuperAdmin,
  serverTimestamp,
  updateUserWithReverificationCheck,
} from '@lib/firestore';
import { collection, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore';

const ROLES = ['ADMIN', 'COMPETITOR', 'VIEWER', 'SUPER_ADMIN'] as const;
const STATUSES = ['ACTIVE', 'SUSPENDED'] as const;
const VERIFICATION_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_REVERIFICATION'] as const;

type Role = (typeof ROLES)[number];
type Status = (typeof STATUSES)[number];
type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authHeader = _request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUid = authHeader.split('Bearer ')[1];
    const adminUser = await getUserByUid(adminUid);

    if (!adminUser || !isAdmin(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const targetUser = await getUser(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user: targetUser });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminUid = authHeader.split('Bearer ')[1];
    const adminUser = await getUserByUid(adminUid);

    if (!adminUser || !isAdmin(adminUser.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const targetUser = await getUser(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();

    // Email is intentionally not editable here. Firebase Auth owns email identity;
    // mutating only the Firestore doc desyncs from Auth.

    // Role-change safety guards
    if (body.role !== undefined) {
      if (!ROLES.includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role', field: 'role' }, { status: 400 });
      }
      if (adminUser.id === id || adminUser.uid === targetUser.uid) {
        return NextResponse.json({ error: 'You cannot change your own role' }, { status: 403 });
      }
      if (isSuperAdmin(targetUser.role) && !isSuperAdmin(adminUser.role)) {
        return NextResponse.json(
          { error: 'Only a SUPER_ADMIN can change another SUPER_ADMIN role' },
          { status: 403 },
        );
      }
      if (body.role === 'SUPER_ADMIN' && !isSuperAdmin(adminUser.role)) {
        return NextResponse.json(
          { error: 'Only a SUPER_ADMIN can grant SUPER_ADMIN role' },
          { status: 403 },
        );
      }
    }

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      if (typeof body.name !== 'string') {
        return NextResponse.json({ error: 'Invalid name', field: 'name' }, { status: 400 });
      }
      const trimmed = body.name.trim();
      if (trimmed.length < 1 || trimmed.length > 100) {
        return NextResponse.json(
          { error: 'Name must be 1-100 characters', field: 'name' },
          { status: 400 },
        );
      }
      updates.name = trimmed;
    }

    if (body.role !== undefined) {
      updates.role = body.role as Role;
    }

    if (body.status !== undefined) {
      if (!STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status', field: 'status' }, { status: 400 });
      }
      updates.status = body.status as Status;
    }

    if (body.bodyweight !== undefined) {
      const bw = Number(body.bodyweight);
      if (!Number.isFinite(bw) || bw <= 0 || bw > 500) {
        return NextResponse.json(
          { error: 'Bodyweight must be between 0 and 500 kg', field: 'bodyweight' },
          { status: 400 },
        );
      }
      updates.bodyweight = bw;
    }

    if (body.dateOfBirth !== undefined) {
      if (body.dateOfBirth === null || body.dateOfBirth === '') {
        updates.dateOfBirth = null;
      } else {
        const dob = new Date(body.dateOfBirth);
        if (isNaN(dob.getTime())) {
          return NextResponse.json(
            { error: 'Invalid date of birth', field: 'dateOfBirth' },
            { status: 400 },
          );
        }
        updates.dateOfBirth = dob;
      }
    }

    if (body.sex !== undefined) {
      if (body.sex !== 'M' && body.sex !== 'F') {
        return NextResponse.json({ error: 'Sex must be M or F', field: 'sex' }, { status: 400 });
      }
      updates.sex = body.sex;
    }

    if (body.verificationStatus !== undefined) {
      if (!VERIFICATION_STATUSES.includes(body.verificationStatus)) {
        return NextResponse.json(
          { error: 'Invalid verification status', field: 'verificationStatus' },
          { status: 400 },
        );
      }
      updates.verificationStatus = body.verificationStatus as VerificationStatus;
      if (body.verificationStatus === 'VERIFIED') {
        updates.verifiedBy = adminUser.id;
        updates.verifiedAt = serverTimestamp();
      }
    }

    if (body.verificationNotes !== undefined) {
      if (body.verificationNotes !== null && typeof body.verificationNotes !== 'string') {
        return NextResponse.json(
          { error: 'Invalid verification notes', field: 'verificationNotes' },
          { status: 400 },
        );
      }
      if (typeof body.verificationNotes === 'string' && body.verificationNotes.length > 1000) {
        return NextResponse.json(
          {
            error: 'Verification notes must be 1000 characters or fewer',
            field: 'verificationNotes',
          },
          { status: 400 },
        );
      }
      updates.verificationNotes = body.verificationNotes;
    }

    if (body.profileName !== undefined) {
      if (body.profileName === null || body.profileName === '') {
        updates.profileName = null;
      } else {
        if (typeof body.profileName !== 'string') {
          return NextResponse.json(
            { error: 'Invalid profile name', field: 'profileName' },
            { status: 400 },
          );
        }
        const available = await isProfileNameAvailable(body.profileName, id);
        if (!available) {
          return NextResponse.json(
            { error: 'Profile name is already taken', field: 'profileName' },
            { status: 409 },
          );
        }
        updates.profileName = body.profileName;
      }
    }

    const booleanFields = [
      'publicProfileEnabled',
      'publicProfileShowAge',
      'publicProfileShowBodyweight',
      'publicProfileShowSex',
    ] as const;
    for (const field of booleanFields) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== 'boolean') {
          return NextResponse.json({ error: `Invalid ${field}`, field }, { status: 400 });
        }
        updates[field] = body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // updateUserWithReverificationCheck handles the bodyweight delta logic and falls through
    // to updateUser for everything else.
    await updateUserWithReverificationCheck(
      id,
      updates as unknown as Parameters<typeof updateUserWithReverificationCheck>[1],
    );

    const wasFlaggedForReverification =
      updates.bodyweight !== undefined && targetUser.verificationStatus === 'VERIFIED';

    return NextResponse.json({
      message: 'User updated successfully',
      reverificationFlagged: wasFlaggedForReverification,
    });
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

    const targetUser = await getUser(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (adminUser.id === targetUserId || adminUser.uid === targetUser.uid) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    const participationsRef = collection(db, 'participations');
    const participationQuery = query(participationsRef, where('userId', '==', targetUserId));
    const participationSnapshot = await getDocs(participationQuery);
    await Promise.all(participationSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)));

    const teamMembersRef = collection(db, 'teamMembers');
    const teamMembersQuery = query(teamMembersRef, where('userId', '==', targetUserId));
    const teamMembersSnapshot = await getDocs(teamMembersQuery);
    await Promise.all(teamMembersSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)));

    const teamInvitationsRef = collection(db, 'teamInvitations');
    const teamInvitationsQuery = query(teamInvitationsRef, where('userId', '==', targetUserId));
    const teamInvitationsSnapshot = await getDocs(teamInvitationsQuery);
    await Promise.all(
      teamInvitationsSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)),
    );

    const scoresRef = collection(db, 'scores');
    const scoresQuery = query(scoresRef, where('userId', '==', targetUserId));
    const scoresSnapshot = await getDocs(scoresQuery);
    await Promise.all(scoresSnapshot.docs.map((docSnapshot) => deleteDoc(docSnapshot.ref)));

    const userRef = doc(db, 'users', targetUserId);
    await deleteDoc(userRef);

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
