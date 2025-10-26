export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getUserTeams, getTeamMembers } from '@/lib/firestore';

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
    const userTeams = await getUserTeams(user.id);

    // Get user's role in each team and member count
    const teamsWithUserRole = await Promise.all(
      userTeams.map(async (team) => {
        const teamMembers = await getTeamMembers(team.id);
        const userMember = teamMembers.find((member) => member.userId === user.id);

        return {
          ...team,
          userRole: userMember ? userMember.role : null,
          isMember: !!userMember,
          memberCount: teamMembers.length,
          logoUrl: team.logoUrl,
        };
      }),
    );

    return NextResponse.json({ teams: teamsWithUserRole });
  } catch (error) {
    console.error('Error fetching user teams:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
