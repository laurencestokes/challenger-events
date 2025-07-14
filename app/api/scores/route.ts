import { NextRequest, NextResponse } from 'next/server';
import {
  getUserByUid,
  isAdmin,
  createScore,
  updateScore,
  getEvent,
  getActivitiesByEvent,
  getUser,
  getScoreByUserActivityAndEvent,
  checkCompetitionVerificationRequired,
  getCompetitionVerification,
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

    // Check if competitor is verified (only for competitors)
    if (competitor.role === 'COMPETITOR' && competitor.verificationStatus !== 'VERIFIED') {
      const statusMessage =
        competitor.verificationStatus === 'NEEDS_REVERIFICATION'
          ? 'Competitor needs re-verification due to profile changes. Please contact an administrator.'
          : 'Competitor verification required. Please contact an administrator to verify this competitor before submitting scores.';

      return NextResponse.json(
        {
          error: statusMessage,
          requiresVerification: true,
        },
        { status: 403 },
      );
    }

    // Check if competitor has been weighed and verified for this specific competition
    const needsCompetitionVerification = await checkCompetitionVerificationRequired(
      competitorId,
      eventId,
    );
    if (needsCompetitionVerification) {
      return NextResponse.json(
        {
          error:
            'Competitor must be weighed and verified for this competition before submitting scores. Please contact an administrator.',
          requiresCompetitionVerification: true,
        },
        { status: 403 },
      );
    }

    // Calculate the scoring system result
    let calculatedScore = Number(rawValue); // Default to raw value if no scoring system
    if (activity.scoringSystemId) {
      try {
        // For rep-based strength exercises, calculate 1RM first
        let valueForScoring = Number(rawValue);
        if (activity.reps && activity.reps > 1) {
          // Import epleyFormula for the calculation
          const { epleyFormula } = await import('@/utils/scoring');
          valueForScoring = epleyFormula(Number(rawValue), activity.reps);
        }

        // Get competition weight if available, otherwise use profile weight
        let bodyweightForScoring = competitor.bodyweight || 70;
        const competitionVerification = await getCompetitionVerification(competitorId, eventId);
        if (competitionVerification && competitionVerification.status === 'VERIFIED') {
          bodyweightForScoring = competitionVerification.bodyweight;
        }

        // Use the shared score calculation function
        const { calculateScore } = await import('@/utils/scoreCalculation');

        try {
          const scoringResult = await calculateScore(
            activity.scoringSystemId,
            valueForScoring,
            bodyweightForScoring,
            competitor.dateOfBirth,
            competitor.sex || 'M',
          );

          calculatedScore = scoringResult.score;
          console.log('Score calculated successfully:', {
            rawValue,
            calculatedScore,
            scoringSystemId: activity.scoringSystemId,
          });
        } catch (error) {
          console.error('Scoring calculation error:', error);
          // Continue with raw value if scoring calculation fails
        }
      } catch (error) {
        console.error('Error calculating score:', error);
        // Continue with raw value if scoring calculation fails
      }
    }

    // Check if a score already exists for this user, activity, and event
    const existingScore = await getScoreByUserActivityAndEvent(competitorId, activityId, eventId);

    let score;
    if (existingScore) {
      // Update the existing score
      await updateScore(existingScore.id, {
        rawValue: Number(rawValue),
        calculatedScore,
        notes: notes || '',
      });
      score = {
        id: existingScore.id,
        userId: competitorId,
        eventId,
        activityId,
        rawValue: Number(rawValue),
        calculatedScore,
        notes: notes || '',
      };
    } else {
      // Create a new score
      score = await createScore({
        userId: competitorId,
        eventId,
        activityId,
        rawValue: Number(rawValue),
        calculatedScore,
        notes: notes || '',
      });
    }

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
