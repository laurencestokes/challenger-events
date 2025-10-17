export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  getTeamInvitationsByEmail,
  getTeam,
  getUserById,
  getTeamMembers,
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

    // Get pending invitations for this user's email
    const pendingInvitations = await getTeamInvitationsByEmail(user.email);

    // Filter out expired invitations
    const now = new Date();
    const validInvitations = pendingInvitations.filter((invitation) => {
      if (invitation.status !== 'PENDING') return false;

      // Handle Firestore Timestamp objects
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
        return false; // Invalid date
      }

      return expiresAt > now;
    });

    // Get team details and inviter information for each invitation
    const invitationsWithTeamDetails = await Promise.all(
      validInvitations.map(async (invitation) => {
        const team = await getTeam(invitation.teamId);
        const teamMembers = team ? await getTeamMembers(team.id) : [];
        const inviter = await getUserById(invitation.invitedBy);
        return {
          ...invitation,
          team: team
            ? {
                id: team.id,
                name: team.name,
                description: team.description,
                logoUrl: (team as unknown as { logoUrl: string }).logoUrl ?? '',
                memberCount: teamMembers.length,
              }
            : null,
          inviter: inviter
            ? {
                id: inviter.id,
                name: inviter.name,
                email: inviter.email,
              }
            : null,
        };
      }),
    );

    return NextResponse.json({ invitations: invitationsWithTeamDetails });
  } catch (error) {
    console.error('Error fetching pending invitations:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
