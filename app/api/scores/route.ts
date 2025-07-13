import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  isAdmin,
  createScore,
  getEvent,
  getActivitiesByEvent,
  getUser,
} from '@/lib/firestore';

export async function POST(request: NextRequest) {
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

    // Check if user is admin
    if (!isAdmin(user.role)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { eventId, competitorId, activityId, rawValue, notes } = await request.json();

    if (!eventId || !competitorId || !activityId || rawValue === undefined) {
      return NextResponse.json(
        { error: 'Event ID, competitor ID, activity ID, and raw value are required' },
        { status: 400 },
      );
    }

    // Validate that the event exists
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Validate that the activity exists
    const activities = await getActivitiesByEvent(eventId);
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
    }

    // Get competitor details for scoring calculation
    const competitor = await getUser(competitorId);
    if (!competitor) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    // Calculate the scoring system result
    let calculatedScore = Number(rawValue); // Default to raw value if no scoring system
    if (activity.scoringSystemId) {
      try {
        const scoringResponse = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calculate-score`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              scoringSystemId: activity.scoringSystemId,
              value: Number(rawValue),
              bodyweight: competitor.bodyweight || 70,
              dateOfBirth: competitor.dateOfBirth,
              sex: competitor.sex || 'M',
            }),
          },
        );

        if (scoringResponse.ok) {
          const scoringResult = await scoringResponse.json();
          calculatedScore = scoringResult.score;
        }
      } catch (error) {
        console.error('Error calculating score:', error);
        // Continue with raw value if scoring calculation fails
      }
    }

    // Create the score
    const score = await createScore({
      userId: competitorId,
      eventId,
      activityId,
      rawValue: Number(rawValue),
      calculatedScore,
      notes: notes || '',
    });

    return NextResponse.json({
      id: score.id,
      userId: score.userId,
      eventId: score.eventId,
      activityId: score.activityId,
      rawValue: score.rawValue,
      calculatedScore: score.calculatedScore,
      notes: score.notes,
    });
  } catch (error) {
    console.error('Error submitting score:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
