import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  getEvent,
  updateEvent,
  deleteEvent,
  isAdmin,
  Event,
  getParticipationsByEvent,
  getUser,
  getScoresByUserAndEvent,
} from '@/lib/firestore';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const event = await getEvent(params.id);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch participants for this event
    const participations = await getParticipationsByEvent(params.id);
    const participants = await Promise.all(
      participations.map(async (participation) => {
        const user = await getUser(participation.userId);
        const scores = await getScoresByUserAndEvent(participation.userId, params.id);

        // Calculate total score if there are scores
        const totalScore =
          scores.length > 0
            ? scores.reduce((sum, score) => sum + score.calculatedScore, 0)
            : undefined;

        return {
          id: participation.userId,
          name: user?.name || 'Unknown User',
          email: user?.email || 'unknown@example.com',
          bodyweight: user?.bodyweight,
          age: user?.age,
          sex: user?.sex,
          joinedAt: participation.joinedAt,
          score: totalScore,
        };
      }),
    );

    // Return event with participants
    return NextResponse.json({
      ...event,
      participants,
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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

    const event = await getEvent(params.id);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user is an admin of this event
    if (!event.adminIds.includes(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      startDate,
      endDate,
      status,
      isTeamEvent,
      teamScoringMethod,
      maxTeamSize,
    } = body;

    const updates: Partial<Event> = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : undefined;
    if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : undefined;
    if (status !== undefined) updates.status = status;
    if (isTeamEvent !== undefined) updates.isTeamEvent = isTeamEvent;
    if (teamScoringMethod !== undefined) updates.teamScoringMethod = teamScoringMethod;
    if (maxTeamSize !== undefined) updates.maxTeamSize = maxTeamSize;

    const updatedEvent = await updateEvent(params.id, updates);

    return NextResponse.json(updatedEvent);
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
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

    const event = await getEvent(params.id);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user is an admin of this event
    if (!event.adminIds.includes(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteEvent(params.id);

    return NextResponse.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
