import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, getEvent, revealHiddenWorkout, isAdmin, getActivity } from '@/lib/firestore';
import { broadcastToEvent } from '@/lib/sse-manager';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; activityId: string } },
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

    // Check if event exists and user has admin access
    const event = await getEvent(params.id);

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get the activity details before revealing
    const activity = await getActivity(params.activityId);
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Reveal the hidden workout
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

    broadcastToEvent(params.id, revealMessage);

    return NextResponse.json({
      success: true,
      workoutName: activity.name,
      message: `Workout "${activity.name}" has been revealed!`,
    });
  } catch (error) {
    console.error('Error revealing workout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
