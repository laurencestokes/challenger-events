import {
  SCORING_SYSTEMS,
  getScoringSystemById,
  getScoringSystemsByCategory,
  getScoringSystemsByInputType,
  ScoringSystem,
} from '../../constants/scoringSystems';

describe('scoringSystems', () => {
  describe('data integrity', () => {
    it('has at least one scoring system', () => {
      expect(SCORING_SYSTEMS.length).toBeGreaterThan(0);
    });

    it.each(SCORING_SYSTEMS.map((s) => [s.id, s]))('%s has all required fields', (_id, system) => {
      const s = system as ScoringSystem;
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.description).toBeTruthy();
      expect(['STRENGTH', 'ENDURANCE', 'MIXED']).toContain(s.category);
      expect(['WEIGHT', 'TIME', 'DISTANCE', 'REPS', 'CUSTOM']).toContain(s.inputType);
      expect(typeof s.requiresBodyweight).toBe('boolean');
      expect(typeof s.requiresAge).toBe('boolean');
      expect(typeof s.requiresSex).toBe('boolean');
      expect(s.calculationFunction).toBeTruthy();
    });

    it('has unique IDs', () => {
      const ids = SCORING_SYSTEMS.map((s) => s.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('getScoringSystemById', () => {
    it('returns the correct system for a valid ID', () => {
      const squat = getScoringSystemById('squat');
      expect(squat).toBeDefined();
      expect(squat!.name).toBe('Squat');
      expect(squat!.category).toBe('STRENGTH');
    });

    it('returns undefined for invalid ID', () => {
      expect(getScoringSystemById('nonexistent')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(getScoringSystemById('')).toBeUndefined();
    });
  });

  describe('getScoringSystemsByCategory', () => {
    it('returns only STRENGTH systems', () => {
      const strength = getScoringSystemsByCategory('STRENGTH');
      expect(strength.length).toBeGreaterThan(0);
      strength.forEach((s) => expect(s.category).toBe('STRENGTH'));
    });

    it('returns only ENDURANCE systems', () => {
      const endurance = getScoringSystemsByCategory('ENDURANCE');
      expect(endurance.length).toBeGreaterThan(0);
      endurance.forEach((s) => expect(s.category).toBe('ENDURANCE'));
    });

    it('STRENGTH + ENDURANCE + MIXED covers all systems', () => {
      const strength = getScoringSystemsByCategory('STRENGTH');
      const endurance = getScoringSystemsByCategory('ENDURANCE');
      const mixed = getScoringSystemsByCategory('MIXED');
      expect(strength.length + endurance.length + mixed.length).toBe(SCORING_SYSTEMS.length);
    });
  });

  describe('getScoringSystemsByInputType', () => {
    it('returns only WEIGHT systems', () => {
      const weight = getScoringSystemsByInputType('WEIGHT');
      expect(weight.length).toBeGreaterThan(0);
      weight.forEach((s) => expect(s.inputType).toBe('WEIGHT'));
    });

    it('returns only TIME systems', () => {
      const time = getScoringSystemsByInputType('TIME');
      expect(time.length).toBeGreaterThan(0);
      time.forEach((s) => expect(s.inputType).toBe('TIME'));
    });

    it('returns only DISTANCE systems', () => {
      const distance = getScoringSystemsByInputType('DISTANCE');
      expect(distance.length).toBeGreaterThan(0);
      distance.forEach((s) => expect(s.inputType).toBe('DISTANCE'));
    });

    it('returns REPS systems', () => {
      const reps = getScoringSystemsByInputType('REPS');
      expect(reps.length).toBeGreaterThan(0);
      reps.forEach((s) => expect(s.inputType).toBe('REPS'));
    });
  });
});
