import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  getEvent,
  getTeam,
  addTeamMember,
  getTeamMembers,
  getUserParticipation,
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

    // Check if user is already a member of the team
    const existingMembers = await getTeamMembers(teamId);
    const isAlreadyMember = existingMembers.some((member) => member.userId === user.id);

    if (!isAlreadyMember) {
      // Add user to team first
      await addTeamMember(teamId, user.id, 'MEMBER');
    }

    // Get user's participation record for this event
    const userParticipation = await getUserParticipation(user.id, eventId);

    if (!userParticipation) {
      return NextResponse.json(
        { error: 'User is not participating in this event' },
        { status: 400 },
      );
    }

    // Update the participation record with the team ID
    await updateParticipation(userParticipation.id, { teamId });

    return NextResponse.json({
      message: 'Successfully joined team for this event',
      team: {
        id: team.id,
        name: team.name,
        description: team.description,
      },
    });
  } catch (error) {
    console.error('Error joining team for event:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
