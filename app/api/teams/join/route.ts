import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getTeam, addTeamMember, getTeamMembers } from '@/lib/firestore';

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
    const { teamId } = body;

    if (!teamId) {
      return NextResponse.json({ error: 'Team ID is required' }, { status: 400 });
    }

    // Check if team exists
    const team = await getTeam(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Check if user is already a member
    const existingMembers = await getTeamMembers(teamId);
    const isAlreadyMember = existingMembers.some((member) => member.userId === user.id);

    if (isAlreadyMember) {
      return NextResponse.json({ error: 'Already a member of this team' }, { status: 400 });
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
    console.error('Error joining team:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
