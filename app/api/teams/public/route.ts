export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getPublicTeams, getTeamMembers } from '@/lib/firestore';

export async function GET(_request: NextRequest) {
  try {
    // Get all public teams
    const publicTeams = await getPublicTeams();

    // Get member count for each team
    const teamsWithMemberCount = await Promise.all(
      publicTeams.map(async (team) => {
        const teamMembers = await getTeamMembers(team.id);
        return {
          ...team,
          memberCount: teamMembers.length,
          logoUrl: team.logoUrl,
        };
      }),
    );

    return NextResponse.json({ teams: teamsWithMemberCount });
  } catch (error) {
    console.error('Error fetching public teams:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
