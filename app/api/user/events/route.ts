export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  getEventsByParticipant,
  getScoresByUserAndEvent,
  getActivitiesByEvent,
} from '@/lib/firestore';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = authHeader.split('Bearer ')[1];
    const user = await getUserByUid(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get events the user has participated in
    const userEvents = await getEventsByParticipant(user.id);

    // For each event, get the user's scores and participation details
    const eventsWithDetails = await Promise.all(
      userEvents.map(async (event) => {
        const scores = await getScoresByUserAndEvent(user.id, event.id);
        // Fetch activities for this event to map activityId to testId
        const activities = await getActivitiesByEvent(event.id);
        const activityMap = Object.fromEntries(activities.map((a) => [a.id, a]));
        // Attach testId to each score
        const scoresWithTestId = scores.map((score) => {
          const activity = activityMap[score.activityId];
          // Use 'scoringSystemId' (should match EVENT_TYPES id), then 'type', then fallback to activity.id
          const testId = activity?.scoringSystemId || activity?.type || activity?.id;
          return {
            ...score,
            testId,
            reps: score.reps || activity?.reps, // Use score reps if available, otherwise activity reps
            workoutName: activity?.name,
            workoutDescription: activity?.description,
            submittedAt: score.submittedAt, // Include submission timestamp
            updatedAt: score.updatedAt, // Include update timestamp
          };
        });

        // Calculate total score
        const totalScore =
          scoresWithTestId.length > 0
            ? scoresWithTestId.reduce((sum, score) => sum + (score.calculatedScore || 0), 0)
            : undefined;

        // Get participation details (we'll need to fetch this separately)
        // For now, we'll use the event creation date as joined date
        // TODO: Implement proper participation tracking

        return {
          ...event,
          scores: scoresWithTestId, // Attach scores with testId
          code: event.code,
          status: event.status,
          joinedAt: event.createdAt, // This should be the actual join date
          score: totalScore,
        };
      }),
    );

    return NextResponse.json(eventsWithDetails);
  } catch (error) {
    console.error('Error fetching user events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
