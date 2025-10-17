export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  getTeamInvitation,
  updateTeamInvitation,
  addTeamMember,
  getTeamMembers,
} from '@/lib/firestore';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    if (!user.id) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const invitationId = params.id;
    const body = await request.json();
    const { action } = body; // 'accept' or 'decline'

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "decline"' },
        { status: 400 },
      );
    }

    // Get the invitation
    const invitation = await getTeamInvitation(invitationId);
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if the invitation is for this user's email
    if (invitation.email !== user.email) {
      return NextResponse.json({ error: 'This invitation is not for you' }, { status: 403 });
    }

    // Check if invitation is still valid
    if (invitation.status !== 'PENDING') {
      return NextResponse.json({ error: 'This invitation is no longer valid' }, { status: 400 });
    }

    // Handle Firestore Timestamp objects for expiration check
    let expiresAt: Date;
    if (
      invitation.expiresAt &&
      typeof invitation.expiresAt === 'object' &&
      'seconds' in invitation.expiresAt
    ) {
      expiresAt = new Date((invitation.expiresAt as { seconds: number }).seconds * 1000);
    } else if (invitation.expiresAt instanceof Date) {
      expiresAt = invitation.expiresAt;
    } else {
      return NextResponse.json({ error: 'Invalid invitation expiration date' }, { status: 400 });
    }

    if (expiresAt < new Date()) {
      return NextResponse.json({ error: 'This invitation has expired' }, { status: 400 });
    }

    if (action === 'accept') {
      try {
        // Check if user is already a member of the team
        const teamMembers = await getTeamMembers(invitation.teamId);
        const existingMember = teamMembers.find((member) => member.userId === user.id);

        if (existingMember) {
          // User is already a member, just update the invitation status
          await updateTeamInvitation(invitationId, { status: 'ACCEPTED' });
          return NextResponse.json({ message: 'You are already a member of this team' });
        }

        // Add user to the team
        await addTeamMember(invitation.teamId, user.id, 'MEMBER');

        // Update invitation status
        await updateTeamInvitation(invitationId, { status: 'ACCEPTED' });

        return NextResponse.json({ message: 'Successfully joined the team' });
      } catch (addMemberError) {
        console.error('Error adding team member:', addMemberError);
        return NextResponse.json(
          {
            error: 'Failed to join team. You may already be a member or there was a server error.',
          },
          { status: 500 },
        );
      }
    } else {
      // Decline the invitation
      await updateTeamInvitation(invitationId, { status: 'EXPIRED' });

      return NextResponse.json({ message: 'Invitation declined' });
    }
  } catch (error) {
    console.error('Error responding to invitation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
