import { NextRequest, NextResponse } from 'next/server';
import { getEvent, getActivitiesByEvent } from '@/lib/firestore';

export async function GET(request: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const { eventId } = params;

    // Get event details
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get activities for this event (only non-hidden activities for public view)
    const activities = await getActivitiesByEvent(eventId, {
      includeHiddenWorkouts: false,
    });

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching public activities:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
