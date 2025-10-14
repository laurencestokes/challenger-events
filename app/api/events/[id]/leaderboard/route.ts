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

interface LeaderboardData {
  eventId: string;
  eventName: string;
  isTeamEvent: boolean;
  teamScoringMethod?: 'SUM' | 'AVERAGE' | 'BEST';
  overallLeaderboard: LeaderboardEntry[];
  workoutLeaderboards: WorkoutLeaderboard[];
  teamOverallLeaderboard?: TeamLeaderboardEntry[];
  teamWorkoutLeaderboards?: TeamWorkoutLeaderboard[];
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;

    // Get event details
    const event = await getEvent(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get all activities for this event (excluding hidden workouts for non-admins)
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
      const teams = await getTeamsByEvent(eventId);

      // Calculate team workout leaderboards
      teamWorkoutLeaderboards = await Promise.all(
        activities.map(async (activity) => {
          const teamScores: {
            teamId: string;
            teamName: string;
            score: number;
            rawValue: number;
            reps?: number;
            rank: number;
          }[] = [];

          for (const team of teams) {
            const teamMembers = await getTeamMembers(team.id);
            const teamScore = calculateTeamScore(
              scores,
              teamMembers,
              team,
              activity.id,
              event.teamScoringMethod || 'SUM',
            );

            if (teamScore) {
              // Calculate average raw value and reps for team (for display purposes)
              const memberScores = scores.filter(
                (score) => score.activityId === activity.id && score.teamId === team.id, // Use stored teamId instead of checking current membership
              );
              const averageRawValue =
                memberScores.length > 0
                  ? memberScores.reduce((sum, score) => sum + score.rawValue, 0) /
                    memberScores.length
                  : 0;
              const averageReps =
                memberScores.length > 0
                  ? memberScores.reduce((sum, score) => sum + (score.reps || 1), 0) /
                    memberScores.length
                  : 1;

              teamScores.push({
                teamId: team.id,
                teamName: team.name,
                score: teamScore.totalScore,
                rawValue: averageRawValue,
                reps: averageReps,
                rank: 0, // Will be calculated below
              });
            }
          }

          // Sort by score and assign ranks
          teamScores.sort((a, b) => b.score - a.score);
          teamScores.forEach((entry, index) => {
            entry.rank = index + 1;
          });

          return {
            activityId: activity.id,
            activityName: activity.name,
            entries: teamScores,
          };
        }),
      );

      // Calculate team overall leaderboard
      const teamOverallScores: TeamLeaderboardEntry[] = [];

      for (const team of teams) {
        const teamMembers = await getTeamMembers(team.id);
        const teamOverallScore = calculateTeamOverallScore(
          scores,
          teamMembers,
          team,
          activities,
          event.teamScoringMethod || 'SUM',
        );

        if (teamOverallScore) {
          // Add workout scores with ranks
          for (const activity of activities) {
            const workoutLeaderboard = teamWorkoutLeaderboards.find(
              (wl) => wl.activityId === activity.id,
            );
            const rank = workoutLeaderboard?.entries.find((e) => e.teamId === team.id)?.rank || 0;

            teamOverallScore.workoutScores[activity.id] = {
              score: teamOverallScore.workoutScores[activity.id]?.score || 0,
              rawValue: teamOverallScore.workoutScores[activity.id]?.rawValue || 0,
              reps: teamOverallScore.workoutScores[activity.id]?.reps,
              rank,
              activityName: activity.name,
            };
          }

          teamOverallScores.push({
            teamId: team.id,
            teamName: team.name,
            totalScore: teamOverallScore.totalScore,
            workoutScores: teamOverallScore.workoutScores,
            rank: 0, // Will be calculated below
          });
        }
      }

      // Sort and rank team overall scores
      teamOverallScores.sort((a, b) => b.totalScore - a.totalScore);
      teamOverallScores.forEach((entry, index) => {
        entry.rank = index + 1;
      });

      teamOverallLeaderboard = teamOverallScores;
    }

    const leaderboardData: LeaderboardData = {
      eventId,
      eventName: event.name,
      isTeamEvent: event.isTeamEvent,
      teamScoringMethod: event.teamScoringMethod,
      overallLeaderboard,
      workoutLeaderboards,
      teamOverallLeaderboard,
      teamWorkoutLeaderboards,
    };

    return NextResponse.json(leaderboardData);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
