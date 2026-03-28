import { calculateTeamScore, calculateTeamOverallScore, rankTeams } from '../../utils/teamScoring';
import { Score, Team, TeamMember } from '@lib/firestore';

// Minimal fixture factories
const makeScore = (
  overrides: Partial<Score> & { userId: string; activityId: string; calculatedScore: number },
): Score => ({
  id: `score_${Math.random().toString(36).slice(2)}`,
  rawValue: overrides.calculatedScore,
  reps: 1,
  verified: true,
  notes: '',
  teamId: overrides.teamId ?? null,
  ...overrides,
});

const makeTeam = (id: string, name: string): Team => ({
  id,
  name,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const makeMember = (userId: string, teamId: string): TeamMember => ({
  id: `member_${userId}`,
  userId,
  teamId,
  role: 'MEMBER',
  joinedAt: new Date(),
});

describe('teamScoring', () => {
  const teamA = makeTeam('teamA', 'Team Alpha');
  const teamB = makeTeam('teamB', 'Team Beta');
  const membersA = [makeMember('u1', 'teamA'), makeMember('u2', 'teamA')];

  describe('calculateTeamScore', () => {
    const scores: Score[] = [
      makeScore({ userId: 'u1', activityId: 'act1', calculatedScore: 100, teamId: 'teamA' }),
      makeScore({ userId: 'u2', activityId: 'act1', calculatedScore: 200, teamId: 'teamA' }),
      makeScore({ userId: 'u3', activityId: 'act1', calculatedScore: 500, teamId: 'teamB' }),
    ];

    it('returns null when no matching scores', () => {
      const result = calculateTeamScore(scores, membersA, teamA, 'nonexistent');
      expect(result).toBeNull();
    });

    it('sums scores with SUM method', () => {
      const result = calculateTeamScore(scores, membersA, teamA, 'act1', 'SUM');
      expect(result).not.toBeNull();
      expect(result!.totalScore).toBe(300);
      expect(result!.memberScores).toHaveLength(2);
    });

    it('averages scores with AVERAGE method', () => {
      const result = calculateTeamScore(scores, membersA, teamA, 'act1', 'AVERAGE');
      expect(result!.totalScore).toBe(150);
    });

    it('takes max with BEST method', () => {
      const result = calculateTeamScore(scores, membersA, teamA, 'act1', 'BEST');
      expect(result!.totalScore).toBe(200);
    });

    it('filters by teamId correctly', () => {
      const result = calculateTeamScore(scores, membersA, teamA, 'act1', 'SUM');
      // Should only include teamA scores (100 + 200), not teamB (500)
      expect(result!.totalScore).toBe(300);
    });

    it('defaults to SUM when no method specified', () => {
      const result = calculateTeamScore(scores, membersA, teamA, 'act1');
      expect(result!.totalScore).toBe(300);
    });
  });

  describe('calculateTeamOverallScore', () => {
    const activities = [
      { id: 'act1', name: 'Activity 1' },
      { id: 'act2', name: 'Activity 2' },
    ];

    const scores: Score[] = [
      makeScore({ userId: 'u1', activityId: 'act1', calculatedScore: 100, teamId: 'teamA' }),
      makeScore({ userId: 'u2', activityId: 'act1', calculatedScore: 200, teamId: 'teamA' }),
      makeScore({ userId: 'u1', activityId: 'act2', calculatedScore: 150, teamId: 'teamA' }),
      makeScore({ userId: 'u2', activityId: 'act2', calculatedScore: 250, teamId: 'teamA' }),
    ];

    it('returns null when no scores match', () => {
      const result = calculateTeamOverallScore([], membersA, teamA, activities);
      expect(result).toBeNull();
    });

    it('aggregates across activities with SUM method', () => {
      const result = calculateTeamOverallScore(scores, membersA, teamA, activities, 'SUM');
      expect(result).not.toBeNull();
      // act1: 100+200=300, act2: 150+250=400, overall SUM: 300+400=700
      expect(result!.totalScore).toBe(700);
      expect(Object.keys(result!.workoutScores)).toHaveLength(2);
    });

    it('aggregates across activities with AVERAGE method', () => {
      const result = calculateTeamOverallScore(scores, membersA, teamA, activities, 'AVERAGE');
      // act1 average: (100+200)/2=150, act2 average: (150+250)/2=200, overall AVERAGE: (150+200)/2=175
      expect(result!.totalScore).toBe(175);
    });

    it('aggregates across activities with BEST method', () => {
      const result = calculateTeamOverallScore(scores, membersA, teamA, activities, 'BEST');
      // act1 best: 200, act2 best: 250, overall BEST: max(200,250)=250
      expect(result!.totalScore).toBe(250);
    });

    it('handles missing activities gracefully', () => {
      const extendedActivities = [...activities, { id: 'act3', name: 'Activity 3' }];
      const result = calculateTeamOverallScore(scores, membersA, teamA, extendedActivities, 'SUM');
      // Only act1 and act2 have scores
      expect(Object.keys(result!.workoutScores)).toHaveLength(2);
    });
  });

  describe('rankTeams', () => {
    it('sorts teams by totalScore descending and assigns ranks', () => {
      const teams = [
        { totalScore: 100, rank: 0 },
        { totalScore: 300, rank: 0 },
        { totalScore: 200, rank: 0 },
      ];
      const ranked = rankTeams(teams);
      expect(ranked[0].totalScore).toBe(300);
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].totalScore).toBe(200);
      expect(ranked[1].rank).toBe(2);
      expect(ranked[2].totalScore).toBe(100);
      expect(ranked[2].rank).toBe(3);
    });

    it('handles empty array', () => {
      expect(rankTeams([])).toEqual([]);
    });

    it('handles single team', () => {
      const teams = [{ totalScore: 500, rank: 0 }];
      const ranked = rankTeams(teams);
      expect(ranked[0].rank).toBe(1);
    });
  });
});
