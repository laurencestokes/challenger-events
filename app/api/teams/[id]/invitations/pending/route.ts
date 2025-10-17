import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getTeam, getTeamMembers, getTeamInvitationsByTeamId } from '@/lib/firestore';
import { convertFirestoreTimestamp } from '@/lib/utils';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from token
    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const teamId = params.id;
    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    // Get team details
    const team = await getTeam(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get team members to check if user is captain
    const teamMembers = await getTeamMembers(teamId);
    const currentUserMember = teamMembers.find((member) => member.userId === user.id);

    if (!currentUserMember || currentUserMember.role !== 'CAPTAIN') {
      return NextResponse.json(
        { error: 'Only team captains can view pending invitations' },
        { status: 403 },
      );
    }

    // Get pending invitations for this team
    const invitations = await getTeamInvitationsByTeamId(teamId);

    // Filter for pending invitations only
    const pendingInvitations = invitations.filter((invitation) => {
      // Check if invitation is still pending and not expired
      const now = new Date();
      const expiresAt = convertFirestoreTimestamp(invitation.expiresAt);

      if (!expiresAt) {
        return false;
      }

      const isPending = invitation.status === 'PENDING';
      const isNotExpired = expiresAt > now;

      return isPending && isNotExpired;
    });

    return NextResponse.json({
      success: true,
      invitations: pendingInvitations,
    });
  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    return NextResponse.json({ error: 'Failed to fetch pending invitations' }, { status: 500 });
  }
}
