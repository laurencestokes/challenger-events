import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid } from '@/lib/firestore';

// GET: Fetch all scores for the authenticated user (both personal and event scores)
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

    // Fetch all scores for this user
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const db = (await import('@/lib/firebase')).db;
    const scoresRef = collection(db, 'scores');
    const q = query(scoresRef, where('userId', '==', user.id));
    const querySnapshot = await getDocs(q);
    const scores = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // For event scores, we need to fetch event and activity details
    const enrichedScores = await Promise.all(
      scores.map(async (score: Record<string, unknown>) => {
        const enrichedScore = {
          id: score.id,
          eventId: score.eventId,
          eventName: null,
          activityId: score.activityId,
          activityName: null,
          rawScore: score.rawValue,
          calculatedScore: score.calculatedScore,
          reps: score.reps || null,
          timestamp: score.submittedAt || score.updatedAt || null,
          testId: score.testId,
          verified: score.verified || false, // Include verified field
        };

        // If it's an event score, fetch event details
        if (score.eventId) {
          try {
            const eventRef = collection(db, 'events');
            const eventQuery = query(eventRef, where('__name__', '==', score.eventId));
            const eventSnapshot = await getDocs(eventQuery);
            if (!eventSnapshot.empty) {
              const eventData = eventSnapshot.docs[0].data();
              enrichedScore.eventName = eventData.name;
            }
          } catch (error) {
            console.error('Error fetching event details:', error);
          }
        }

        // Fetch activity details
        try {
          const activitiesRef = collection(db, 'activities');
          const activityQuery = query(activitiesRef, where('__name__', '==', score.activityId));
          const activitySnapshot = await getDocs(activityQuery);
          if (!activitySnapshot.empty) {
            const activityData = activitySnapshot.docs[0].data();
            enrichedScore.activityName = activityData.name;
          }
        } catch (error) {
          console.error('Error fetching activity details:', error);
        }

        return enrichedScore;
      }),
    );

    return NextResponse.json({
      success: true,
      data: enrichedScores,
    });
  } catch (error) {
    console.error('Error fetching all scores:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
