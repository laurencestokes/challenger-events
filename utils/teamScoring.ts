import { Score, Team, TeamMember } from '@/lib/firestore';

export interface TeamScore {
  teamId: string;
  teamName: string;
  activityId: string;
  activityName: string;
  totalScore: number;
  memberScores: {
    userId: string;
    userName: string;
    score: number;
  }[];
  rank: number;
}

export interface TeamOverallScore {
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

export const calculateTeamScore = (
  scores: Score[],
  teamMembers: TeamMember[],
  team: Team,
  activityId: string,
  scoringMethod: 'SUM' | 'AVERAGE' | 'BEST' = 'SUM',
): TeamScore | null => {
  // Get scores for team members in this activity
  const memberScores = scores.filter(
    (score) =>
      score.activityId === activityId &&
      teamMembers.some((member) => member.userId === score.userId),
  );

  if (memberScores.length === 0) return null;

  // Calculate team score based on method
  let totalScore = 0;
  switch (scoringMethod) {
    case 'SUM':
      totalScore = memberScores.reduce((sum, score) => sum + score.calculatedScore, 0);
      break;
    case 'AVERAGE':
      totalScore =
        memberScores.reduce((sum, score) => sum + score.calculatedScore, 0) / memberScores.length;
      break;
    case 'BEST':
      totalScore = Math.max(...memberScores.map((score) => score.calculatedScore));
      break;
  }

  return {
    teamId: team.id,
    teamName: team.name,
    activityId,
    activityName: '', // Will be filled by caller
    totalScore,
    memberScores: memberScores.map((score) => ({
      userId: score.userId,
      userName: '', // Will be filled by caller
      score: score.calculatedScore,
    })),
    rank: 0, // Will be calculated by caller
  };
};

export const calculateTeamOverallScore = (
  scores: Score[],
  teamMembers: TeamMember[],
  team: Team,
  activities: { id: string; name: string }[],
  scoringMethod: 'SUM' | 'AVERAGE' | 'BEST' = 'SUM',
): TeamOverallScore | null => {
  const workoutScores: {
    [activityId: string]: { score: number; rawValue: number; reps?: number; rank: number; activityName: string };
  } = {};
  let totalScore = 0;

  // Calculate scores for each workout
  for (const activity of activities) {
    const teamScore = calculateTeamScore(scores, teamMembers, team, activity.id, scoringMethod);
    if (teamScore) {
      // Calculate average raw value and reps for team (for display purposes)
      const memberScores = scores.filter(
        (score) =>
          score.activityId === activity.id &&
          teamMembers.some((member) => member.userId === score.userId),
      );
      const averageRawValue =
        memberScores.length > 0
          ? memberScores.reduce((sum, score) => sum + score.rawValue, 0) / memberScores.length
          : 0;
      const averageReps =
        memberScores.length > 0
          ? memberScores.reduce((sum, score) => sum + (score.reps || 1), 0) / memberScores.length
          : 1;

      workoutScores[activity.id] = {
        score: teamScore.totalScore,
        rawValue: averageRawValue,
        reps: averageReps,
        rank: 0, // Will be calculated by caller
        activityName: activity.name,
      };
      totalScore += teamScore.totalScore;
    }
  }

  if (Object.keys(workoutScores).length === 0) return null;

  return {
    teamId: team.id,
    teamName: team.name,
    totalScore,
    workoutScores,
    rank: 0, // Will be calculated by caller
  };
};

export const rankTeams = <T extends { rank: number }>(teams: T[]): T[] => {
  return teams
    .sort((a, b) => {
      // Sort by total score (descending)
      if ('totalScore' in a && 'totalScore' in b) {
        return (b as any).totalScore - (a as any).totalScore;
      }
      return 0;
    })
    .map((team, index) => ({
      ...team,
      rank: index + 1,
    }));
};
