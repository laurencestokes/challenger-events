import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  getTeam,
  getTeamMembers,
  createTeamInvitation,
  generateInvitationCode,
} from '@/lib/firestore';
import { sendTeamInvitation } from '@/lib/email';

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

    const teamId = params.id;

    // Get team details
    const team = await getTeam(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user is a member of the team
    const teamMembers = await getTeamMembers(teamId);
    const userMember = teamMembers.find((member) => member.userId === user.id);

    if (!userMember) {
      return NextResponse.json(
        { error: 'You must be a member of the team to send invitations' },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user is already a member of the team
    const existingMember = teamMembers.find((member) => {
      // We'll need to get the user by email to check if they're already a member
      // For now, we'll just check if the email matches any existing member
      return member.userId === email; // This is a simplified check
    });

    if (existingMember) {
      return NextResponse.json({ error: 'User is already a member of this team' }, { status: 400 });
    }

    // Generate invitation code
    const code = generateInvitationCode();

    // Set expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const invitation = await createTeamInvitation({
      teamId,
      email,
      code,
      invitedBy: user.id,
      status: 'PENDING',
      expiresAt,
    });

    // Send email invitation
    try {
      await sendTeamInvitation(email, team.name, code, user.name || user.email);
    } catch (emailError) {
      console.error('Error sending email invitation:', emailError);
      // Don't fail the request if email fails, but log it
    }

    return NextResponse.json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        code: invitation.code,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error creating team invitation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
