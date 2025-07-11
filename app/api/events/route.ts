import { NextRequest, NextResponse } from 'next/server';
import {
  createEvent,
  getEventsByAdmin,
  getEventsByParticipant,
  getUserByUid,
  generateEventCode,
  isAdmin,
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

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, startDate, endDate, isTeamEvent, teamScoringMethod, maxTeamSize } =
      body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate unique event code
    let code: string;
    let isUnique = false;
    while (!isUnique) {
      code = generateEventCode();
      // Check if code exists (you might want to add a helper function for this)
      // For now, we'll assume it's unique
      isUnique = true;
    }

    const event = await createEvent({
      name,
      description,
      code: code!,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      adminIds: [user.id],
      status: 'DRAFT',
      isTeamEvent: isTeamEvent ?? true, // Default to true
      teamScoringMethod: isTeamEvent ? teamScoringMethod : undefined,
      maxTeamSize: isTeamEvent ? maxTeamSize : undefined,
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
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

    let events;
    if (isAdmin(user.role)) {
      // Admins see all events they have access to
      events = await getEventsByAdmin(user.id);
    } else {
      // Competitors see events they're participating in
      events = await getEventsByParticipant(user.id);
    }

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
