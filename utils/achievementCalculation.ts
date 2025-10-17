import {
  CANONICAL_EVENTS,
  ALL_ACHIEVEMENTS,
  getCanonicalEventsByCategory,
} from '../constants/achievements';
import { EventType } from '../constants/eventTypes';

export interface Score {
  eventTypeId: string;
  score: number;
  verified: boolean;
  event?: any; // Event object if this score is from an event
}

export interface AchievementResult {
  achievement: any;
  earned: boolean;
  score?: number;
}

// Calculate overall verified score using only canonical events
export const calculateVerifiedOverallScore = (scores: Score[]): number => {
  const canonicalScores = scores.filter(
    (score) =>
      CANONICAL_EVENTS.some((event) => event.id === score.eventTypeId) &&
      (score.verified || score.event), // verified scores or scores from events
  );

  // Get the highest score for each canonical event (including 0s for missing events)
  const bestScoresByEvent: Record<string, number> = {};

  // Initialize all canonical events with 0
  CANONICAL_EVENTS.forEach((event) => {
    bestScoresByEvent[event.id] = 0;
  });

  // Update with actual scores
  canonicalScores.forEach((score) => {
    const currentBest = bestScoresByEvent[score.eventTypeId] || 0;
    if (score.score > currentBest) {
      bestScoresByEvent[score.eventTypeId] = score.score;
    }
  });

  // Calculate average including 0s for missing events
  const totalScore = Object.values(bestScoresByEvent).reduce((sum, score) => sum + score, 0);
  return Math.round(totalScore / CANONICAL_EVENTS.length);
};

// Calculate overall score (verified + unverified) using only canonical events
export const calculateOverallScore = (scores: Score[]): number => {
  const canonicalScores = scores.filter((score) =>
    CANONICAL_EVENTS.some((event) => event.id === score.eventTypeId),
  );

  // Get the highest score for each canonical event (including 0s for missing events)
  const bestScoresByEvent: Record<string, number> = {};

  // Initialize all canonical events with 0
  CANONICAL_EVENTS.forEach((event) => {
    bestScoresByEvent[event.id] = 0;
  });

  // Update with actual scores
  canonicalScores.forEach((score) => {
    const currentBest = bestScoresByEvent[score.eventTypeId] || 0;
    if (score.score > currentBest) {
      bestScoresByEvent[score.eventTypeId] = score.score;
    }
  });

  // Calculate average including 0s for missing events
  const totalScore = Object.values(bestScoresByEvent).reduce((sum, score) => sum + score, 0);
  return Math.round(totalScore / CANONICAL_EVENTS.length);
};

// Calculate average score for a specific category (strength/endurance)
export const calculateCategoryAverage = (
  scores: Score[],
  category: 'STRENGTH' | 'ENDURANCE',
): number => {
  const categoryEvents = getCanonicalEventsByCategory(category);
  const categoryScores = scores.filter(
    (score) =>
      categoryEvents.some((event) => event.id === score.eventTypeId) &&
      (score.verified || score.event), // only verified scores for specialists
  );

  // Get the highest verified score for each category event (including 0s for missing events)
  const bestScoresByEvent: Record<string, number> = {};

  // Initialize all category events with 0
  categoryEvents.forEach((event) => {
    bestScoresByEvent[event.id] = 0;
  });

  // Update with actual scores
  categoryScores.forEach((score) => {
    const currentBest = bestScoresByEvent[score.eventTypeId] || 0;
    if (score.score > currentBest) {
      bestScoresByEvent[score.eventTypeId] = score.score;
    }
  });

  // Calculate average including 0s for missing events
  const totalScore = Object.values(bestScoresByEvent).reduce((sum, score) => sum + score, 0);
  return Math.round(totalScore / categoryEvents.length);
};

// Check if user has achieved a score threshold on any individual event
export const hasAchievedScoreThreshold = (
  scores: Score[],
  threshold: number,
): { achieved: boolean; highestScore: number } => {
  const verifiedScores = scores.filter(
    (score) =>
      CANONICAL_EVENTS.some((event) => event.id === score.eventTypeId) &&
      (score.verified || score.event), // verified scores or scores from events
  );

  if (verifiedScores.length === 0) {
    return { achieved: false, highestScore: 0 };
  }

  // Find the highest individual score achieved
  const highestScore = Math.max(...verifiedScores.map((score) => score.score));

  return {
    achieved: highestScore >= threshold,
    highestScore,
  };
};

// Get all earned achievements for a user
export const calculateUserAchievements = (scores: Score[]): AchievementResult[] => {
  const verifiedOverallScore = calculateVerifiedOverallScore(scores);
  const strengthAverage = calculateCategoryAverage(scores, 'STRENGTH');
  const enduranceAverage = calculateCategoryAverage(scores, 'ENDURANCE');
  const hybridAverage = calculateVerifiedOverallScore(scores); // Same as verified overall

  return ALL_ACHIEVEMENTS.map((achievement) => {
    let earned = false;
    let score: number | undefined;

    switch (achievement.requirement.type) {
      case 'VERIFIED_SCORE_MIN':
        const thresholdResult = hasAchievedScoreThreshold(
          scores,
          achievement.requirement.threshold,
        );
        earned = thresholdResult.achieved;
        score = thresholdResult.highestScore;
        break;

      case 'STRENGTH_AVERAGE':
        earned = strengthAverage >= achievement.requirement.threshold;
        score = strengthAverage;
        break;

      case 'ENDURANCE_AVERAGE':
        earned = enduranceAverage >= achievement.requirement.threshold;
        score = enduranceAverage;
        break;

      case 'HYBRID_AVERAGE':
        earned = hybridAverage >= achievement.requirement.threshold;
        score = hybridAverage;
        break;
    }

    return {
      achievement,
      earned,
      score,
    };
  });
};

// Get only the highest score threshold achievement earned
export const getHighestScoreAchievement = (
  achievements: AchievementResult[],
): AchievementResult | null => {
  const scoreAchievements = achievements.filter(
    (a) => a.achievement.category === 'SCORE_THRESHOLD' && a.earned,
  );

  if (scoreAchievements.length === 0) return null;

  // Sort by threshold descending and return the highest
  return scoreAchievements.sort(
    (a, b) => b.achievement.requirement.threshold - a.achievement.requirement.threshold,
  )[0];
};

// Get all specialist achievements earned
export const getSpecialistAchievements = (
  achievements: AchievementResult[],
): AchievementResult[] => {
  return achievements.filter((a) => a.achievement.category === 'SPECIALIST' && a.earned);
};
