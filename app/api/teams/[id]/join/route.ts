import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getTeam, getTeamMembers, addTeamMember } from '@/lib/firestore';

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

    // Only PUBLIC teams can be joined directly
    if (team.scope !== 'PUBLIC') {
      return NextResponse.json(
        { error: 'This team requires an invitation to join' },
        { status: 403 },
      );
    }

    // Check if user is already a member of the team
    const teamMembers = await getTeamMembers(teamId);
    const existingMember = teamMembers.find((member) => member.userId === user.id);

    if (existingMember) {
      return NextResponse.json({ error: 'You are already a member of this team' }, { status: 400 });
    }

    // Add user to team
    await addTeamMember(teamId, user.id, 'MEMBER');

    return NextResponse.json({
      message: 'Successfully joined team',
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
      },
    });
  } catch (error) {
    console.error('Error joining public team:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
