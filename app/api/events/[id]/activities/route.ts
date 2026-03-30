import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  getEvent,
  createActivity,
  getActivitiesByEvent,
  isAdmin,
} from '@lib/firestore';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];

    const user = await getUserByUid(userId);

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if event exists and user has admin access
    const event = await getEvent(id);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    const body = await request.json();

    const { name, description, type, scoringSystemId, unit, reps, order, isHidden } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    // Get existing activities to determine order if not provided
    let activityOrder = order;
    if (activityOrder === undefined) {
      const existingActivities = await getActivitiesByEvent(id, {
        includeHiddenWorkouts: false,
      });
      activityOrder = existingActivities.length;
    }

    const activity = await createActivity({
      eventId: id,
      name,
      description,
      type,
      scoringSystemId,
      unit,
      reps,
      order: activityOrder,
      isHidden: isHidden ?? false,
    });

    return NextResponse.json(activity);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];

    const user = await getUserByUid(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if event exists
    const event = await getEvent(id);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user is admin to determine if they should see hidden workouts
    const isAdminUser = isAdmin(user.role);
    const includeHidden = isAdminUser;

    // Get activities for the event
    const activities = await getActivitiesByEvent(id, {
      includeHiddenWorkouts: includeHidden,
    });

    return NextResponse.json(activities);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
