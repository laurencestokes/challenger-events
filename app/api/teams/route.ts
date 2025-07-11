import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, createTeam, addTeamMember } from '@/lib/firestore';

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
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Team name is required' }, { status: 400 });
    }

    // Create the team
    const team = await createTeam({
      name,
      description: description || '',
    });

    // Add the creator as the team captain
    await addTeamMember(team.id, user.id, 'CAPTAIN');

    return NextResponse.json({
      message: 'Team created successfully',
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
      },
    });
  } catch (error) {
    console.error('Error creating team:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}

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

    // Get teams that the user is a member of
    const { getUserTeams } = await import('@/lib/firestore');
    const userTeams = await getUserTeams(user.id);

    return NextResponse.json({ teams: userTeams });
  } catch (error) {
    console.error('Error fetching user teams:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
