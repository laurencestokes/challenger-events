import { NextRequest, NextResponse } from 'next/server';
import { getUserByUid, createScore } from '@/lib/firestore';
import { EVENT_TYPES } from '@/constants/eventTypes';
import { calculateScore } from '@/utils/scoreCalculation';

// GET: Fetch all personal (non-event) scores for the authenticated user
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
    // Fetch all scores for this user where eventId is null/undefined
    const { collection, query, where, getDocs } = await import('firebase/firestore');
    const db = (await import('@/lib/firebase')).db;
    const scoresRef = collection(db, 'scores');
    const q = query(scoresRef, where('userId', '==', user.id), where('eventId', '==', null));
    const querySnapshot = await getDocs(q);
    const scores = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(scores);
  } catch (error) {
    console.error('Error fetching personal scores:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Submit a new personal (non-event) score
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
    const { activityId, rawValue, reps, notes } = await request.json();
    if (!activityId || rawValue === undefined) {
      return NextResponse.json(
        { error: 'Activity ID and raw value are required' },
        { status: 400 },
      );
    }
    // Find the activity and scoring system
    const activity = EVENT_TYPES.find((a) => a.id === activityId);
    if (!activity) {
      return NextResponse.json({ error: 'Invalid activity' }, { status: 400 });
    }
    // Calculate score using the scoring system and user profile
    let calculatedScore = Number(rawValue);
    const repsToUse = reps || activity.defaultReps || 1;
    if (activity.scoringSystemId) {
      try {
        const valueForScoring = Number(rawValue);
        // No Epley logic, just pass reps
        const scoringResult = await calculateScore(
          activity.scoringSystemId,
          valueForScoring,
          user.bodyweight ?? 70,
          user.dateOfBirth,
          user.sex || 'M',
          repsToUse,
        );
        calculatedScore = scoringResult.score;
      } catch (err) {
        console.error('Error calculating score:', err);
      }
    }
    // Create a new personal score (eventId omitted)
    const score = await createScore({
      userId: user.id,
      activityId,
      rawValue: Number(rawValue), // Always save as entered
      calculatedScore,
      reps: repsToUse, // Save the reps used for this score
      notes: notes || '',
      verified: false,
      eventId: null,
      teamId: null, // Personal scores don't have a team
    });
    // Trigger on-demand revalidation for the user's public profile page
    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/revalidate/profile/${user.uid}`,
        {
          method: 'POST',
          headers: {
            'x-revalidate-secret': process.env.REVALIDATE_SECRET || '',
          },
        },
      );
    } catch (err) {
      console.error('Failed to revalidate public profile page:', err);
    }
    return NextResponse.json({
      ...score,
      reps: repsToUse, // Include reps in the response
    });
  } catch (error) {
    console.error('Error submitting personal score:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
