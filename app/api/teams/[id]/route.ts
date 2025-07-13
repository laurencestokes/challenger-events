import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getTeam, getTeamMembers, getUser } from '@/lib/firestore';
import { convertFirestoreTimestamp } from '@/lib/utils';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Get team members
    const teamMembers = await getTeamMembers(teamId);

    // Get user details for each member
    const membersWithDetails = await Promise.all(
      teamMembers.map(async (member) => {
        const memberUser = await getUser(member.userId);
        return {
          id: member.id,
          userId: member.userId,
          role: member.role,
          joinedAt: member.joinedAt,
          user: memberUser
            ? {
                id: memberUser.id,
                name: memberUser.name,
                email: memberUser.email,
                role: memberUser.role,
              }
            : null,
        };
      }),
    );

    return NextResponse.json({
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
        createdAt: convertFirestoreTimestamp(team.createdAt),
      },
      members: membersWithDetails.map((member) => ({
        ...member,
        joinedAt: convertFirestoreTimestamp(member.joinedAt),
      })),
    });
  } catch (error) {
    console.error('Error fetching team details:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
