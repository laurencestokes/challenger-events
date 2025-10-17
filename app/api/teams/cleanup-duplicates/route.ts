import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getUserTeams, cleanupDuplicateTeamMemberships } from '@/lib/firestore';

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

    // Get all teams the user is a member of
    const userTeams = await getUserTeams(user.id);
    let cleanedUpCount = 0;

    // Clean up duplicates for each team
    for (const team of userTeams) {
      await cleanupDuplicateTeamMemberships(user.id, team.id);
      cleanedUpCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up duplicate memberships for ${cleanedUpCount} teams`,
      teamsProcessed: cleanedUpCount,
    });
  } catch (error) {
    console.error('Error cleaning up duplicate memberships:', error);
    return NextResponse.json(
      { error: 'Failed to clean up duplicate memberships' },
      { status: 500 },
    );
  }
}
