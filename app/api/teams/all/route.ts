export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getAllTeams, getTeamMembers } from '@/lib/firestore';

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

    // Get all teams
    const allTeams = await getAllTeams();

    // Get user's role in each team
    const teamsWithUserRole = await Promise.all(
      allTeams.map(async (team) => {
        const teamMembers = await getTeamMembers(team.id);
        const userMember = teamMembers.find((member) => member.userId === user.id);

        return {
          ...team,
          userRole: userMember ? userMember.role : null,
          isMember: !!userMember,
        };
      }),
    );

    // Separate teams by user membership
    const userTeams = teamsWithUserRole.filter((team) => team.isMember);
    const availableTeams = teamsWithUserRole.filter((team) => !team.isMember);

    return NextResponse.json({
      userTeams,
      availableTeams,
    });
  } catch (error) {
    console.error('Error fetching all teams:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
