import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  isAdmin,
  getScoresByEvent,
  getActivitiesByEvent,
  getEvent,
  getUser,
} from '@lib/firestore';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const eventId = id;

    // Verify that the event exists
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Fetch all scores for this event
    const scores = await getScoresByEvent(eventId);

    // Fetch activities for this event to enrich score data
    const activities = await getActivitiesByEvent(eventId, { includeHiddenWorkouts: true });
    const activityMap = Object.fromEntries(activities.map((a) => [a.id, a]));

    // Check which scores belong to deleted users
    const orphanedScores = await Promise.all(
      scores.map(async (score) => {
        const scoreUser = await getUser(score.userId);
        // If user doesn't exist, this is an orphaned score
        if (!scoreUser) {
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
        }
        return null;
      }),
    );

    // Filter out null values (scores from existing users)
    const filteredOrphanedScores = orphanedScores.filter((score) => score !== null);

    return NextResponse.json({ scores: filteredOrphanedScores });
  } catch (error) {
    console.error('Error fetching orphaned scores:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
