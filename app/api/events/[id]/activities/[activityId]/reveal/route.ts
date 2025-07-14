import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getEvent, revealHiddenWorkout, isAdmin } from '@/lib/firestore';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; activityId: string } },
) {
  try {
    console.log('POST /api/events/[id]/activities/[activityId]/reveal - params:', params);

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

    // Reveal the hidden workout
    console.log('Revealing workout:', params.activityId);
    await revealHiddenWorkout(params.activityId);

    // TODO: Send real-time notification to connected clients
    // This could be implemented with WebSockets, Server-Sent Events, or a pub/sub system
    // For now, we'll rely on clients polling for updates

    console.log('Workout revealed successfully');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revealing workout:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
