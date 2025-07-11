import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  getEvent,
  getUserParticipation,
  getUserTeams,
  updateParticipation,
} from '@/lib/firestore';

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

    const eventId = params.id;
    const event = await getEvent(eventId);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!event.isTeamEvent) {
      return NextResponse.json({ error: 'This event does not support teams' }, { status: 400 });
    }

    // Get user's participation record for this event
    const participation = await getUserParticipation(user.id, eventId);

    if (!participation) {
      return NextResponse.json(
        { error: 'User is not participating in this event' },
        { status: 400 },
      );
    }

    // If participation already has teamId, return success
    if (participation.teamId) {
      return NextResponse.json({
        message: 'Participation already has team ID',
        teamId: participation.teamId,
      });
    }

    // Get user's teams
    const userTeams = await getUserTeams(user.id);

    if (userTeams.length === 0) {
      return NextResponse.json({ error: 'User is not a member of any teams' }, { status: 400 });
    }

    // Use the first team (or you could add logic to choose which team)
    const teamToUse = userTeams[0];

    // Update the participation record with the team ID
    await updateParticipation(participation.id, { teamId: teamToUse.id });

    return NextResponse.json({
      message: 'Successfully updated participation with team ID',
      teamId: teamToUse.id,
      teamName: teamToUse.name,
    });
  } catch (error) {
    console.error('Error fixing team participation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
