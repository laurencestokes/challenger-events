import { NextRequest, NextResponse } from 'next/server';
import {
  getEventByCode,
  getUserByUid,
  createParticipation,
  checkUserParticipation,
} from '@/lib/firestore';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // For now, we'll trust the client-side authentication
    // The user ID is passed in the token (which is actually the Firebase UID)
    const userId = authHeader.split('Bearer ')[1];

    const user = await getUserByUid(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { eventCode } = body;

    if (!eventCode) {
      return NextResponse.json({ error: 'Event code is required' }, { status: 400 });
    }

    // Find event by code
    const event = await getEventByCode(eventCode.toUpperCase());

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.status === 'DRAFT') {
      return NextResponse.json({ error: 'Event is not yet published' }, { status: 400 });
    }

    if (event.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Event has already ended' }, { status: 400 });
    }

    if (event.status === 'CANCELLED') {
      return NextResponse.json({ error: 'Event has been cancelled' }, { status: 400 });
    }

    if (event.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Event is not available for joining' }, { status: 400 });
    }

    // Check if user is already participating
    const isAlreadyParticipating = await checkUserParticipation(user.id, event.id);

    if (isAlreadyParticipating) {
      return NextResponse.json({ error: 'Already participating in this event' }, { status: 400 });
    }

    // Create participation record
    await createParticipation({
      userId: user.id,
      eventId: event.id,
    });

    return NextResponse.json({
      message: 'Successfully joined event',
      event: {
        id: event.id,
        name: event.name,
        code: event.code,
        status: event.status,
      },
    });
  } catch (error) {
    console.error('Error joining event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
