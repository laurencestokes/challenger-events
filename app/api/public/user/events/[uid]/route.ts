import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  getEventsByParticipant,
  getScoresByUserAndEvent,
  getActivitiesByEvent,
} from '@/lib/firestore';

export async function GET(request: NextRequest, { params }: { params: { uid: string } }) {
  try {
    const { uid } = params;
    const user = await getUserByUid(uid);
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
          const testId = activity?.scoringSystemId || activity?.type || activity?.id;
          return {
            id: score.id,
            activityId: score.activityId,
            testId,
            eventId: score.eventId,
            rawValue: score.rawValue,
            calculatedScore: score.calculatedScore,
            verified: score.verified,
            verifiedAt: score.verifiedAt,
            submittedAt: score.submittedAt,
            reps: activity?.reps,
            workoutName: activity?.name,
            workoutDescription: activity?.description,
          };
        });
        return {
          id: event.id,
          name: event.name,
          code: event.code,
          status: event.status,
          joinedAt: event.createdAt,
          scores: scoresWithTestId,
        };
      }),
    );
    return NextResponse.json(eventsWithDetails);
  } catch (error) {
    console.error('Error fetching public user events:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
