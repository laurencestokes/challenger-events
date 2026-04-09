import {
  CANONICAL_EVENTS,
  SCORE_THRESHOLD_ACHIEVEMENTS,
  SPECIALIST_ACHIEVEMENTS,
  COMPETITOR_ACHIEVEMENT,
  ALL_ACHIEVEMENTS,
  getAchievementById,
  getCanonicalEventsByCategory,
  getSpecialistAchievementsWithFlexibility,
} from '../../constants/achievements';

describe('achievements constants', () => {
  describe('CANONICAL_EVENTS', () => {
    it('contains the expected event IDs', () => {
      const ids = CANONICAL_EVENTS.map((e) => e.id);
      expect(ids).toContain('squat');
      expect(ids).toContain('bench');
      expect(ids).toContain('deadlift');
      expect(ids).toContain('bike_10km');
      expect(ids).toContain('ski_1km');
      expect(ids).toContain('running_1mile');
    });

    it('has exactly 6 canonical events', () => {
      expect(CANONICAL_EVENTS).toHaveLength(6);
    });

    it('each event has a category', () => {
      CANONICAL_EVENTS.forEach((event) => {
        expect(['STRENGTH', 'ENDURANCE']).toContain(event.category);
      });
    });
  });

  describe('SCORE_THRESHOLD_ACHIEVEMENTS', () => {
    it('has 9 threshold achievements (100-900)', () => {
      expect(SCORE_THRESHOLD_ACHIEVEMENTS).toHaveLength(9);
    });

    it('thresholds are 100, 200, ..., 900', () => {
      const thresholds = SCORE_THRESHOLD_ACHIEVEMENTS.map((a) => a.requirement.threshold);
      expect(thresholds).toEqual([100, 200, 300, 400, 500, 600, 700, 800, 900]);
    });

    it('all have SCORE_THRESHOLD category', () => {
      SCORE_THRESHOLD_ACHIEVEMENTS.forEach((a) => {
        expect(a.category).toBe('SCORE_THRESHOLD');
        expect(a.requirement.type).toBe('VERIFIED_SCORE_MIN');
      });
    });

    it('IDs follow score_N pattern', () => {
      SCORE_THRESHOLD_ACHIEVEMENTS.forEach((a) => {
        expect(a.id).toMatch(/^score_\d{3}$/);
      });
    });
  });

  describe('SPECIALIST_ACHIEVEMENTS', () => {
    it('has strength, endurance, and hybrid specialists', () => {
      const ids = SPECIALIST_ACHIEVEMENTS.map((a) => a.id);
      expect(ids).toContain('strength_specialist');
      expect(ids).toContain('endurance_specialist');
      expect(ids).toContain('hybrid_specialist');
    });

    it('all have SPECIALIST category', () => {
      SPECIALIST_ACHIEVEMENTS.forEach((a) => {
        expect(a.category).toBe('SPECIALIST');
      });
    });

    it('each has a threshold of 500', () => {
      SPECIALIST_ACHIEVEMENTS.forEach((a) => {
        expect(a.requirement.threshold).toBe(500);
      });
    });
  });

  describe('COMPETITOR_ACHIEVEMENT', () => {
    it('has threshold of 1', () => {
      expect(COMPETITOR_ACHIEVEMENT.requirement.threshold).toBe(1);
    });

    it('is a PARTICIPATION category', () => {
      expect(COMPETITOR_ACHIEVEMENT.category).toBe('PARTICIPATION');
    });
  });

  describe('ALL_ACHIEVEMENTS', () => {
    it('includes competitor + threshold + specialist achievements', () => {
      expect(ALL_ACHIEVEMENTS).toHaveLength(
        1 + SCORE_THRESHOLD_ACHIEVEMENTS.length + SPECIALIST_ACHIEVEMENTS.length,
      );
    });

    it('has unique IDs', () => {
      const ids = ALL_ACHIEVEMENTS.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('getAchievementById', () => {
    it('returns correct achievement for valid ID', () => {
      const result = getAchievementById('score_500');
      expect(result).toBeDefined();
      expect(result!.requirement.threshold).toBe(500);
    });

    it('returns competitor achievement', () => {
      const result = getAchievementById('competitor');
      expect(result).toBeDefined();
      expect(result!.name).toBe('Competitor');
    });

    it('returns undefined for invalid ID', () => {
      expect(getAchievementById('nonexistent')).toBeUndefined();
    });
  });

  describe('getCanonicalEventsByCategory', () => {
    it('returns strength events', () => {
      const strength = getCanonicalEventsByCategory('STRENGTH');
      expect(strength.length).toBeGreaterThan(0);
      strength.forEach((e) => expect(e.category).toBe('STRENGTH'));
    });

    it('returns endurance events', () => {
      const endurance = getCanonicalEventsByCategory('ENDURANCE');
      expect(endurance.length).toBeGreaterThan(0);
      endurance.forEach((e) => expect(e.category).toBe('ENDURANCE'));
    });

    it('strength + endurance covers all canonical events', () => {
      const strength = getCanonicalEventsByCategory('STRENGTH');
      const endurance = getCanonicalEventsByCategory('ENDURANCE');
      expect(strength.length + endurance.length).toBe(CANONICAL_EVENTS.length);
    });
  });

  describe('getSpecialistAchievementsWithFlexibility', () => {
    it('returns specialist achievements', () => {
      const result = getSpecialistAchievementsWithFlexibility({});
      expect(result).toEqual(SPECIALIST_ACHIEVEMENTS);
    });
  });
});
