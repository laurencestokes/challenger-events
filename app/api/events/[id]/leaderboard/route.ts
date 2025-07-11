import { NextRequest, NextResponse } from 'next/server';
import {
  getEvent,
  getActivitiesByEvent,
  getScoresByEvent,
  getUser,
  getParticipationsByEvent,
} from '@/lib/firestore';

interface LeaderboardEntry {
  userId: string;
  name: string;
  email: string;
  totalScore: number;
  workoutScores: {
    [activityId: string]: {
      score: number;
      rank: number;
      activityName: string;
    };
  };
  rank: number;
}

interface WorkoutLeaderboard {
  activityId: string;
  activityName: string;
  entries: {
    userId: string;
    name: string;
    email: string;
    score: number;
    rank: number;
  }[];
}

interface LeaderboardData {
  eventId: string;
  eventName: string;
  overallLeaderboard: LeaderboardEntry[];
  workoutLeaderboards: WorkoutLeaderboard[];
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;

    // Get event details
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get all activities for this event
    const activities = await getActivitiesByEvent(eventId);

    // Get all scores for this event
    const scores = await getScoresByEvent(eventId);

    // Get all participants (both from participations and from scores)
    const participations = await getParticipationsByEvent(eventId);
    const participationUserIds = participations.map((p) => p.userId);

    // Get all unique user IDs from scores
    const scoreUserIds = [...new Set(scores.map((score) => score.userId))];

    // Combine both sets of user IDs
    const allUserIds = [...new Set([...participationUserIds, ...scoreUserIds])];

    const participants = await Promise.all(
      allUserIds.map(async (userId) => {
        const user = await getUser(userId);
        console.log(`Fetching user ${userId}:`, user); // Debug log
        return {
          id: userId,
          name: user?.name || 'Unknown User',
          email: user?.email || 'unknown@example.com',
        };
      }),
    );

    // Create workout leaderboards
    const workoutLeaderboards: WorkoutLeaderboard[] = activities.map((activity) => {
      const activityScores = scores.filter((score) => score.activityId === activity.id);

      // Create entries for this workout
      const entries = activityScores
        .map((score) => {
          const participant = participants.find((p) => p.id === score.userId);
          return {
            userId: score.userId,
            name: participant?.name || 'Unknown User',
            email: participant?.email || 'unknown@example.com',
            score: score.calculatedScore || 0,
            rank: 0, // Will be calculated below
          };
        })
        .sort((a, b) => b.score - a.score); // Sort by score descending

      // Assign ranks
      entries.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      return {
        activityId: activity.id,
        activityName: activity.name,
        entries,
      };
    });

    // Create overall leaderboard
    const overallLeaderboard: LeaderboardEntry[] = participants.map((participant) => {
      const participantScores = scores.filter((score) => score.userId === participant.id);

      // Calculate total score
      const totalScore = participantScores.reduce(
        (sum, score) => sum + (score.calculatedScore || 0),
        0,
      );

      // Create workout scores object
      const workoutScores: {
        [activityId: string]: { score: number; rank: number; activityName: string };
      } = {};

      participantScores.forEach((score) => {
        const activity = activities.find((a) => a.id === score.activityId);
        if (activity) {
          // Find rank in this workout
          const workoutLeaderboard = workoutLeaderboards.find(
            (wl) => wl.activityId === score.activityId,
          );
          const rank =
            workoutLeaderboard?.entries.find((e) => e.userId === participant.id)?.rank || 0;

          workoutScores[score.activityId] = {
            score: score.calculatedScore || 0,
            rank,
            activityName: activity.name,
          };
        }
      });

      return {
        userId: participant.id,
        name: participant.name,
        email: participant.email,
        totalScore,
        workoutScores,
        rank: 0, // Will be calculated below
      };
    });

    // Sort overall leaderboard by total score and assign ranks
    overallLeaderboard.sort((a, b) => b.totalScore - a.totalScore);
    overallLeaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    const leaderboardData: LeaderboardData = {
      eventId,
      eventName: event.name,
      overallLeaderboard,
      workoutLeaderboards,
    };

    return NextResponse.json(leaderboardData);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
