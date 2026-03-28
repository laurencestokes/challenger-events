import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, isAdmin, getEvent, getUserParticipation, getUser } from '@lib/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } },
) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const eventId = params.id;
    const participantUserId = params.userId;

    // Verify that the event exists
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Verify that the participant user exists
    const participant = await getUser(participantUserId);
    if (!participant) {
      return NextResponse.json({ error: 'Participant not found' }, { status: 404 });
    }

    // Get participation record for this user and event
    const participation = await getUserParticipation(participantUserId, eventId);

    return NextResponse.json({
      participation: participation
        ? {
            id: participation.id,
            userId: participation.userId,
            eventId: participation.eventId,
            teamId: participation.teamId,
            joinedAt: participation.joinedAt,
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching participation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
