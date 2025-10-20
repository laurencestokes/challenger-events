import {
  calculateOverallScore,
  calculateVerifiedOverallScore,
  type Score as AchievementScore,
} from '@/utils/achievementCalculation';

// Accept minimal score shape required for totals computation
type MinimalScore = {
  activityId?: string;
  calculatedScore: number;
  verified?: boolean;
  // allow extra properties (e.g., timestamp, reps, etc.)
  [key: string]: unknown;
};

interface EventWithOptionalScores {
  scores?: MinimalScore[];
}

export function computeTotalsFromScores(
  personalScores: MinimalScore[],
  userEvents: EventWithOptionalScores[] = [],
) {
  const eventActivityScores = userEvents.flatMap((event) =>
    (event.scores ?? []).map((score) => ({ ...score, event })),
  );

  const allScores = [...eventActivityScores, ...personalScores];

  const achievementScores: AchievementScore[] = allScores.map((s) => ({
    eventTypeId: (s as unknown as { testId?: string }).testId ?? s.activityId ?? '',
    score: s.calculatedScore,
    verified: s.verified || !!(s as unknown as { event?: unknown }).event,
    event: (s as unknown as { event?: unknown }).event,
  }));

  return {
    total: calculateOverallScore(achievementScores),
    verifiedTotal: calculateVerifiedOverallScore(achievementScores),
  };
}
