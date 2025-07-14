import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getEvent, revealHiddenWorkout, isAdmin, getActivity } from '@/lib/firestore';
import { broadcastToEvent } from '@/lib/sse-manager';

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

    // Get the activity details before revealing
    const activity = await getActivity(params.activityId);
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Reveal the hidden workout
    console.log('Revealing workout:', params.activityId);
    await revealHiddenWorkout(params.activityId);

    // Broadcast the reveal event to all connected clients
    const revealMessage = JSON.stringify({
      type: 'workout_revealed',
      eventId: params.id,
      workoutId: params.activityId,
      workoutName: activity.name,
      timestamp: new Date().toISOString(),
      message: `Workout "${activity.name}" has been revealed!`,
    });

    console.log('SSE: Broadcasting reveal message:', revealMessage);
    console.log('SSE: Event ID for broadcast:', params.id);

    broadcastToEvent(params.id, revealMessage);
    console.log('SSE: Broadcast completed');
    console.log('Broadcasted workout reveal to connected clients');

    console.log('Workout revealed successfully');
    return NextResponse.json({
      success: true,
      workoutName: activity.name,
      message: `Workout "${activity.name}" has been revealed!`,
    });
  } catch (error) {
    console.error('Error revealing workout:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `Internal server error: ${errorMessage}` }, { status: 500 });
  }
}
