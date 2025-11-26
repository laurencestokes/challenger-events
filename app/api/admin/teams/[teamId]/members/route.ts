import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  getUser,
  isAdmin,
  getTeam,
  getTeamMembers,
  addTeamMember,
} from '@/lib/firestore';

export async function POST(request: NextRequest, { params }: { params: { teamId: string } }) {
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

    const teamId = params.teamId;
    const body = await request.json();
    const { userIds, role = 'MEMBER' } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'User IDs array is required and must not be empty' },
        { status: 400 },
      );
    }

    // Validate role
    if (role !== 'MEMBER' && role !== 'CAPTAIN') {
      return NextResponse.json(
        { error: 'Invalid role. Must be MEMBER or CAPTAIN' },
        { status: 400 },
      );
    }

    // Verify team exists
    const team = await getTeam(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get existing team members
    const existingMembers = await getTeamMembers(teamId);
    const existingUserIds = new Set(existingMembers.map((member) => member.userId));

    // Add users to team
    const results = [];
    const errors = [];

    for (const targetUserId of userIds) {
      // Check if user exists
      const targetUser = await getUser(targetUserId);
      if (!targetUser) {
        errors.push({ userId: targetUserId, error: 'User not found' });
        continue;
      }

      // Check if already a member
      if (existingUserIds.has(targetUserId)) {
        errors.push({ userId: targetUserId, error: 'User is already a member of this team' });
        continue;
      }

      try {
        // Add user to team
        await addTeamMember(teamId, targetUserId, role as 'CAPTAIN' | 'MEMBER');
        results.push({
          userId: targetUserId,
          name: targetUser.name,
          email: targetUser.email,
          isGuest: targetUser.isGuest || false,
        });
        // Add to existing set to avoid duplicates in the same request
        existingUserIds.add(targetUserId);
      } catch (error) {
        console.error(`Error adding user ${targetUserId} to team:`, error);
        errors.push({
          userId: targetUserId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      message: `Successfully added ${results.length} user(s) to team`,
      added: results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Error adding users to team:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
