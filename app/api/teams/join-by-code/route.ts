import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  getTeamInvitationByCode,
  getTeam,
  getTeamMembers,
  addTeamMember,
  updateTeamInvitation,
} from '@/lib/firestore';

export async function POST(request: NextRequest) {
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
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Invitation code is required' }, { status: 400 });
    }

    // Get invitation by code
    const invitation = await getTeamInvitationByCode(code);
    if (!invitation) {
      return NextResponse.json({ error: 'Invalid invitation code' }, { status: 404 });
    }

    // Check if invitation is expired
    const now = new Date();
    const expiresAt =
      invitation.expiresAt instanceof Date ? invitation.expiresAt : new Date(invitation.expiresAt);

    if (now > expiresAt) {
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 });
    }

    // Check if invitation is already accepted
    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json({ error: 'Invitation has already been accepted' }, { status: 400 });
    }

    // Check if invitation is for the correct email
    if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invitation is not for your email address' },
        { status: 403 },
      );
    }

    // Get team details
    const team = await getTeam(invitation.teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user is already a member of the team
    const teamMembers = await getTeamMembers(invitation.teamId);
    const existingMember = teamMembers.find((member) => member.userId === user.id);

    if (existingMember) {
      return NextResponse.json({ error: 'You are already a member of this team' }, { status: 400 });
    }

    // Add user to team
    await addTeamMember(invitation.teamId, user.id, 'MEMBER');

    // Update invitation status to accepted
    await updateTeamInvitation(invitation.id, { status: 'ACCEPTED' });

    return NextResponse.json({
      message: 'Successfully joined team',
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
      },
    });
  } catch (error) {
    console.error('Error joining team by code:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
