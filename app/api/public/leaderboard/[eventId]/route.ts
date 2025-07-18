import { NextRequest, NextResponse } from 'next/server';
import {
  getEvent,
  getActivitiesByEvent,
  getScoresByEvent,
  getUser,
  getParticipationsByEvent,
  getTeamsByEvent,
  getTeamMembers,
} from '@/lib/firestore';
import { calculateTeamScore, calculateTeamOverallScore } from '@/utils/teamScoring';

interface LeaderboardEntry {
  userId: string;
  name: string;
  email: string;
  totalScore: number;
  workoutScores: {
    [activityId: string]: {
      score: number;
      rawValue: number;
      reps?: number;
      rank: number;
      activityName: string;
      scoringSystemId?: string;
    };
  };
  rank: number;
  teamId?: string;
  teamName?: string;
}

interface WorkoutLeaderboard {
  activityId: string;
  activityName: string;
  entries: {
    userId: string;
    name: string;
    email: string;
    score: number;
    rawValue: number;
    reps?: number;
    rank: number;
    teamId?: string;
    teamName?: string;
    scoringSystemId?: string;
  }[];
}

interface TeamLeaderboardEntry {
  teamId: string;
  teamName: string;
  totalScore: number;
  workoutScores: {
    [activityId: string]: {
      score: number;
      rawValue: number;
      reps?: number;
      rank: number;
      activityName: string;
    };
  };
  rank: number;
}

interface TeamWorkoutLeaderboard {
  activityId: string;
  activityName: string;
  entries: {
    teamId: string;
    teamName: string;
    score: number;
    rawValue: number;
    reps?: number;
    rank: number;
  }[];
}

export async function GET(request: NextRequest, { params }: { params: { eventId: string } }) {
  try {
    const eventId = params.eventId;

    // Get event details
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get all activities for this event (excluding hidden workouts for public view)
    const activities = await getActivitiesByEvent(eventId, { includeHiddenWorkouts: false });

    // Get all scores for this event
    const scores = await getScoresByEvent(eventId);

    // Get all participants (both from participations and from scores)
    const participations = await getParticipationsByEvent(eventId);
    const participationUserIds = participations.map((p) => p.userId);

    // Get all unique user IDs from scores
    const scoreUserIds = Array.from(new Set(scores.map((score) => score.userId)));

    // Combine both sets of user IDs
    const allUserIds = Array.from(new Set([...participationUserIds, ...scoreUserIds]));

    const participants = await Promise.all(
      allUserIds.map(async (userId) => {
        const user = await getUser(userId);

        // Get team information if this is a team event
        let teamId: string | undefined;
        let teamName: string | undefined;

        if (event.isTeamEvent) {
          // Find the participation record for this user in this event
          const participation = participations.find((p) => p.userId === userId);
          if (participation?.teamId) {
            // Get team details directly
            const { getTeam } = await import('@/lib/firestore');
            const team = await getTeam(participation.teamId);
            if (team) {
              teamId = team.id;
              teamName = team.name;
            }
          }
        }

        return {
          id: userId,
          name: user?.name || 'Unknown User',
          email: user?.email || 'unknown@example.com',
          teamId,
          teamName,
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
            rawValue: score.rawValue || 0,
            reps: score.reps,
            rank: 0, // Will be calculated below
            teamId: participant?.teamId,
            teamName: participant?.teamName,
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
        entries: entries.map((entry) => ({
          ...entry,
          scoringSystemId: activity.scoringSystemId,
        })),
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
        [activityId: string]: {
          score: number;
          rawValue: number;
          reps?: number;
          rank: number;
          activityName: string;
          scoringSystemId?: string;
        };
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
            rawValue: score.rawValue || 0,
            reps: score.reps,
            rank,
            activityName: activity.name,
            scoringSystemId: activity.scoringSystemId,
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
        teamId: participant.teamId,
        teamName: participant.teamName,
      };
    });

    // Sort overall leaderboard by total score and assign ranks
    overallLeaderboard.sort((a, b) => b.totalScore - a.totalScore);
    overallLeaderboard.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Calculate team leaderboards if this is a team event
    let teamOverallLeaderboard: TeamLeaderboardEntry[] | undefined;
    let teamWorkoutLeaderboards: TeamWorkoutLeaderboard[] | undefined;

    if (event.isTeamEvent) {
      // Get all teams for this event
      const teams = await getTeamsByEvent(eventId);

      // Calculate team overall leaderboard
      const teamOverallScores = await Promise.all(
        teams.map(async (team) => {
          const teamMembers = await getTeamMembers(team.id);

          // Calculate team total score
          const teamOverallScore = calculateTeamOverallScore(
            scores,
            teamMembers,
            team,
            activities,
            event.teamScoringMethod,
          );

          if (!teamOverallScore) return null;

          return {
            teamId: team.id,
            teamName: team.name,
            totalScore: teamOverallScore.totalScore,
            workoutScores: teamOverallScore.workoutScores,
            rank: 0, // Will be calculated below
          };
        }),
      );

      // Filter out null results and sort
      teamOverallLeaderboard = teamOverallScores
        .filter((score): score is TeamLeaderboardEntry => score !== null)
        .sort((a, b) => b.totalScore - a.totalScore);

      // Assign ranks
      teamOverallLeaderboard.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      // Calculate team workout leaderboards
      teamWorkoutLeaderboards = await Promise.all(
        activities.map(async (activity) => {
          const activityScores = scores.filter((score) => score.activityId === activity.id);

          // Group scores by team
          const teamScores = new Map<string, typeof scores>();
          activityScores.forEach((score) => {
            const participant = participants.find((p) => p.id === score.userId);
            if (participant?.teamId) {
              if (!teamScores.has(participant.teamId)) {
                teamScores.set(participant.teamId, []);
              }
              teamScores.get(participant.teamId)!.push(score);
            }
          });

          // Calculate team scores for this workout
          const entriesPromises = Array.from(teamScores.entries()).map(async ([teamId, scores]) => {
            const participant = participants.find((p) => p.teamId === teamId);
            const team = teams.find((t) => t.id === teamId);

            if (!team) return null;

            const teamMembers = await getTeamMembers(teamId);

            const teamScore = calculateTeamScore(
              scores,
              teamMembers,
              team,
              activity.id,
              event.teamScoringMethod,
            );

            if (!teamScore) return null;

            return {
              teamId,
              teamName: participant?.teamName || 'Unknown Team',
              score: teamScore.totalScore,
              rawValue: 0, // Team scores don't have raw values
              rank: 0, // Will be calculated below
            };
          });

          const entries = (await Promise.all(entriesPromises)).filter(
            (entry): entry is NonNullable<typeof entry> => entry !== null,
          );

          // Sort by score and assign ranks
          entries.sort((a, b) => b.score - a.score);
          entries.forEach((entry, index) => {
            entry.rank = index + 1;
          });

          return {
            activityId: activity.id,
            activityName: activity.name,
            entries,
          };
        }),
      );
    }

    return NextResponse.json({
      eventId,
      eventName: event.name,
      isTeamEvent: event.isTeamEvent,
      teamScoringMethod: event.teamScoringMethod,
      overallLeaderboard,
      workoutLeaderboards,
      teamOverallLeaderboard,
      teamWorkoutLeaderboards,
    });
  } catch (error) {
    console.error('Error fetching public leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
