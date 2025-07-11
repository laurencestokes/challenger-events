import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  getEvent,
  createActivity,
  getActivitiesByEvent,
  isAdmin,
} from '@/lib/firestore';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('POST /api/events/[id]/activities - params:', params);

    const authHeader = request.headers.get('authorization');
    console.log('Auth header:', authHeader ? 'present' : 'missing');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    console.log('User ID:', userId);

    const user = await getUserByUid(userId);
    console.log('User found:', !!user, 'Role:', user?.role);

    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if event exists and user has admin access
    const event = await getEvent(params.id);
    console.log('Event found:', !!event);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    console.log('User ID:', user.id, 'Event admin IDs:', event.adminIds);
    if (!event.adminIds.includes(user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    console.log('Request body:', body);

    const { name, description, type, scoringSystemId, unit, order } = body;

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    // Get existing activities to determine order if not provided
    let activityOrder = order;
    if (activityOrder === undefined) {
      const existingActivities = await getActivitiesByEvent(params.id);
      activityOrder = existingActivities.length;
    }

    console.log('Creating activity with order:', activityOrder);

    const activity = await createActivity({
      eventId: params.id,
      name,
      description,
      type,
      scoringSystemId,
      unit,
      order: activityOrder,
    });

    console.log('Activity created:', activity);
    return NextResponse.json(activity);
  } catch (error) {
    console.error('Error creating activity:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('GET /api/events/[id]/activities - params:', params);

    const authHeader = request.headers.get('authorization');
    console.log('Auth header:', authHeader ? 'present' : 'missing');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    console.log('User ID:', userId);

    const user = await getUserByUid(userId);
    console.log('User found:', !!user);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if event exists
    const event = await getEvent(params.id);
    console.log('Event found:', !!event);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get activities for the event
    console.log('Fetching activities for event:', params.id);
    const activities = await getActivitiesByEvent(params.id);
    console.log('Activities found:', activities.length);

    return NextResponse.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
