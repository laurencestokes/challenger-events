import {
  calculateVerifiedOverallScore,
  calculateOverallScore,
  calculateCategoryAverage,
  hasAchievedScoreThreshold,
  calculateUserAchievements,
  getHighestScoreAchievement,
  getSpecialistAchievements,
  Score,
} from '../../utils/achievementCalculation';
import { CANONICAL_EVENTS } from '../../constants/achievements';

// Helper to create a score for a canonical event
const makeScore = (
  eventTypeId: string,
  score: number,
  verified = true,
  event: any = undefined,
): Score => ({
  eventTypeId,
  score,
  verified,
  event,
});

// Get canonical event IDs grouped by category for test fixtures
const strengthEvents = CANONICAL_EVENTS.filter((e) => e.category === 'STRENGTH').map((e) => e.id);
const enduranceEvents = CANONICAL_EVENTS.filter((e) => e.category === 'ENDURANCE').map((e) => e.id);

describe('achievementCalculation', () => {
  describe('calculateVerifiedOverallScore', () => {
    it('returns 0 for empty scores', () => {
      expect(calculateVerifiedOverallScore([])).toBe(0);
    });

    it('returns 0 for only non-canonical events', () => {
      const scores = [makeScore('some_random_event', 500)];
      expect(calculateVerifiedOverallScore(scores)).toBe(0);
    });

    it('averages across all canonical events (including 0 for missing)', () => {
      // Score 800 on one canonical event, rest are 0
      const scores = [makeScore(CANONICAL_EVENTS[0].id, 800)];
      const expected = Math.round(800 / CANONICAL_EVENTS.length);
      expect(calculateVerifiedOverallScore(scores)).toBe(expected);
    });

    it('calculates correct average when all canonical events have scores', () => {
      const scores = CANONICAL_EVENTS.map((event, i) => makeScore(event.id, (i + 1) * 100));
      const total = CANONICAL_EVENTS.reduce((sum, _, i) => sum + (i + 1) * 100, 0);
      expect(calculateVerifiedOverallScore(scores)).toBe(
        Math.round(total / CANONICAL_EVENTS.length),
      );
    });

    it('takes highest score when duplicates exist for same event', () => {
      const scores = [
        makeScore(CANONICAL_EVENTS[0].id, 300),
        makeScore(CANONICAL_EVENTS[0].id, 500),
        makeScore(CANONICAL_EVENTS[0].id, 400),
      ];
      const expected = Math.round(500 / CANONICAL_EVENTS.length);
      expect(calculateVerifiedOverallScore(scores)).toBe(expected);
    });

    it('includes scores from events (event object present) even if not verified', () => {
      const scores = [makeScore(CANONICAL_EVENTS[0].id, 600, false, { id: 'event1' })];
      const expected = Math.round(600 / CANONICAL_EVENTS.length);
      expect(calculateVerifiedOverallScore(scores)).toBe(expected);
    });

    it('excludes unverified scores without event object', () => {
      const scores = [makeScore(CANONICAL_EVENTS[0].id, 600, false)];
      expect(calculateVerifiedOverallScore(scores)).toBe(0);
    });
  });

  describe('calculateOverallScore', () => {
    it('returns 0 for empty scores', () => {
      expect(calculateOverallScore([])).toBe(0);
    });

    it('includes unverified scores (unlike verified version)', () => {
      const scores = [makeScore(CANONICAL_EVENTS[0].id, 600, false)];
      const expected = Math.round(600 / CANONICAL_EVENTS.length);
      expect(calculateOverallScore(scores)).toBe(expected);
    });

    it('ignores non-canonical events', () => {
      const scores = [makeScore('not_canonical', 999)];
      expect(calculateOverallScore(scores)).toBe(0);
    });

    it('takes highest when duplicates exist', () => {
      const scores = [
        makeScore(CANONICAL_EVENTS[0].id, 200, false),
        makeScore(CANONICAL_EVENTS[0].id, 700, false),
      ];
      const expected = Math.round(700 / CANONICAL_EVENTS.length);
      expect(calculateOverallScore(scores)).toBe(expected);
    });
  });

  describe('calculateCategoryAverage', () => {
    it('returns 0 for empty scores', () => {
      expect(calculateCategoryAverage([], 'STRENGTH')).toBe(0);
    });

    it('calculates strength average correctly', () => {
      const scores = strengthEvents.map((id) => makeScore(id, 500));
      expect(calculateCategoryAverage(scores, 'STRENGTH')).toBe(500);
    });

    it('calculates endurance average correctly', () => {
      const scores = enduranceEvents.map((id) => makeScore(id, 400));
      expect(calculateCategoryAverage(scores, 'ENDURANCE')).toBe(400);
    });

    it('includes 0 for missing events in category', () => {
      // Only score one strength event
      if (strengthEvents.length > 1) {
        const scores = [makeScore(strengthEvents[0], 600)];
        const expected = Math.round(600 / strengthEvents.length);
        expect(calculateCategoryAverage(scores, 'STRENGTH')).toBe(expected);
      }
    });
  });

  describe('hasAchievedScoreThreshold', () => {
    it('returns false with no scores', () => {
      const result = hasAchievedScoreThreshold([], 500);
      expect(result.achieved).toBe(false);
      expect(result.highestScore).toBe(0);
    });

    it('returns true when a score meets the threshold', () => {
      const scores = [makeScore(CANONICAL_EVENTS[0].id, 500)];
      const result = hasAchievedScoreThreshold(scores, 500);
      expect(result.achieved).toBe(true);
      expect(result.highestScore).toBe(500);
    });

    it('returns true when a score exceeds the threshold', () => {
      const scores = [makeScore(CANONICAL_EVENTS[0].id, 750)];
      const result = hasAchievedScoreThreshold(scores, 500);
      expect(result.achieved).toBe(true);
      expect(result.highestScore).toBe(750);
    });

    it('returns false when all scores are below threshold', () => {
      const scores = [
        makeScore(CANONICAL_EVENTS[0].id, 200),
        makeScore(CANONICAL_EVENTS[1].id, 300),
      ];
      const result = hasAchievedScoreThreshold(scores, 500);
      expect(result.achieved).toBe(false);
      expect(result.highestScore).toBe(300);
    });

    it('ignores non-canonical events', () => {
      const scores = [makeScore('random_event', 999)];
      const result = hasAchievedScoreThreshold(scores, 500);
      expect(result.achieved).toBe(false);
      expect(result.highestScore).toBe(0);
    });
  });

  describe('calculateUserAchievements', () => {
    it('returns all achievements as not earned for empty scores', () => {
      const results = calculateUserAchievements([]);
      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => expect(r.earned).toBe(false));
    });

    it('earns threshold achievement when score is high enough', () => {
      const scores = [makeScore(CANONICAL_EVENTS[0].id, 500)];
      const results = calculateUserAchievements(scores);
      const score500 = results.find((r) => r.achievement.id === 'score_500');
      expect(score500?.earned).toBe(true);
    });

    it('does not earn threshold achievement when score is too low', () => {
      const scores = [makeScore(CANONICAL_EVENTS[0].id, 100)];
      const results = calculateUserAchievements(scores);
      const score500 = results.find((r) => r.achievement.id === 'score_500');
      expect(score500?.earned).toBe(false);
    });
  });

  describe('getHighestScoreAchievement', () => {
    it('returns null when no score threshold achievements earned', () => {
      const results = calculateUserAchievements([]);
      expect(getHighestScoreAchievement(results)).toBeNull();
    });

    it('returns the highest threshold achievement earned', () => {
      const scores = [makeScore(CANONICAL_EVENTS[0].id, 700)];
      const results = calculateUserAchievements(scores);
      const highest = getHighestScoreAchievement(results);
      expect(highest).not.toBeNull();
      expect(highest!.achievement.requirement.threshold).toBe(700);
    });
  });

  describe('getSpecialistAchievements', () => {
    it('returns empty array when no specialist achievements earned', () => {
      const results = calculateUserAchievements([]);
      expect(getSpecialistAchievements(results)).toEqual([]);
    });
  });
});
