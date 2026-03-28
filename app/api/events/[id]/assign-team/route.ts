import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  isAdmin,
  getEvent,
  getTeam,
  addTeamMember,
  getTeamMembers,
  getUserParticipation,
  createParticipation,
  updateParticipation,
  getUser,
} from '@lib/firestore';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const eventId = params.id;
    const event = await getEvent(eventId);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!event.isTeamEvent) {
      return NextResponse.json({ error: 'This event does not support teams' }, { status: 400 });
    }

    const body = await request.json();
    const { competitorId, teamId } = body;

    if (!competitorId) {
      return NextResponse.json({ error: 'Competitor ID is required' }, { status: 400 });
    }

    // Verify competitor exists
    const competitor = await getUser(competitorId);
    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    // Get existing participation to check current team
    const participation = await getUserParticipation(competitorId, eventId);
    const currentTeamId = participation?.teamId;

    // If removing team assignment (teamId is null or empty)
    if (!teamId) {
      if (participation) {
        // Remove team from participation
        await updateParticipation(participation.id, { teamId: undefined });
      } else {
        // Create participation without team if it doesn't exist
        await createParticipation({
          userId: competitorId,
          eventId: eventId,
          teamId: undefined,
        });
      }

      return NextResponse.json({
        message: 'Successfully removed team assignment',
      });
    }

    // Verify team exists
    const team = await getTeam(teamId);
    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // If changing teams, remove from old team (optional - you may want to keep them in both)
    // For now, we'll keep them in the old team but update participation
    // If you want to remove from old team, uncomment the following:
    /*
            if (currentTeamId && currentTeamId !== teamId) {
              const oldTeamMembers = await getTeamMembers(currentTeamId);
              const oldMember = oldTeamMembers.find((m) => m.userId === competitorId);
              if (oldMember) {
                // Remove from old team - you'd need a removeTeamMember function for this
                // await removeTeamMember(currentTeamId, competitorId);
              }
            }
            */

    // Check if competitor is already a team member of the new team
    const existingMembers = await getTeamMembers(teamId);
    const isAlreadyMember = existingMembers.some((member) => member.userId === competitorId);

    if (!isAlreadyMember) {
      // Add competitor to team (works for both regular users and guest users)
      await addTeamMember(teamId, competitorId, 'MEMBER');
    }

    // Get or create participation record
    if (!participation) {
      // Create participation record if it doesn't exist
      await createParticipation({
        userId: competitorId,
        eventId: eventId,
        teamId: teamId,
      });
    } else {
      // Update existing participation with teamId (this handles both new assignment and changes)
      await updateParticipation(participation.id, { teamId: teamId });
    }

    return NextResponse.json({
      message: currentTeamId
        ? 'Successfully changed team assignment'
        : 'Successfully assigned team to competitor',
      team: {
        id: team.id,
        name: team.name,
      },
    });
  } catch (error) {
    console.error('Error assigning team:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
