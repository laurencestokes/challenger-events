import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  isAdmin,
  getScoresByUserAndEvent,
  getActivitiesByEvent,
  getEvent,
} from '@lib/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } },
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

    const eventId = params.id;
    const participantUserId = params.userId;

    // Verify that the event exists
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch all scores for this user in this event
    const scores = await getScoresByUserAndEvent(participantUserId, eventId);

    // Fetch activities for this event to enrich score data
    const activities = await getActivitiesByEvent(eventId, { includeHiddenWorkouts: true });
    const activityMap = Object.fromEntries(activities.map((a) => [a.id, a]));

    // Enrich scores with activity details
    const enrichedScores = scores.map((score) => {
      const activity = activityMap[score.activityId];
      return {
        id: score.id,
        userId: score.userId,
        eventId: score.eventId,
        activityId: score.activityId,
        activityName: activity?.name || 'Unknown Activity',
        activityType: activity?.type,
        activityUnit: activity?.unit,
        rawValue: score.rawValue,
        calculatedScore: score.calculatedScore,
        reps: score.reps,
        notes: score.notes,
        verified: score.verified,
        verifiedAt: score.verifiedAt,
        verifiedBy: score.verifiedBy,
        teamId: score.teamId,
        submittedAt: score.submittedAt,
        updatedAt: score.updatedAt,
      };
    });

    return NextResponse.json({ scores: enrichedScores });
  } catch (error) {
    console.error('Error fetching user scores:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
