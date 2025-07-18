import { NextRequest, NextResponse } from 'next/server';
import { getEvent } from '@/lib/firestore';
import { convertFirestoreTimestamp } from '@/lib/utils';

export async function GET(request: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const { eventId } = params;

    // Get event details
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Return only public event information
    return NextResponse.json({
      id: event.id,
      name: event.name,
      description: event.description,
      status: event.status,
      startDate: event.startDate ? convertFirestoreTimestamp(event.startDate)?.toISOString() : null,
      endDate: event.endDate ? convertFirestoreTimestamp(event.endDate)?.toISOString() : null,
      isTeamEvent: event.isTeamEvent,
      teamScoringMethod: event.teamScoringMethod,
      maxTeamSize: event.maxTeamSize,
    });
  } catch (error) {
    console.error('Error fetching public event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
