import {
  EVENT_TYPES,
  EventType,
  getEventTypeById,
  getEventTypesByCategory,
} from '../../constants/eventTypes';
import { SCORING_SYSTEMS } from '../../constants/scoringSystems';

describe('eventTypes constants', () => {
  describe('data integrity', () => {
    it('has at least one event type', () => {
      expect(EVENT_TYPES.length).toBeGreaterThan(0);
    });

    it('has unique IDs', () => {
      const ids = EVENT_TYPES.map((e) => e.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(EVENT_TYPES.map((e) => [e.id, e]))('%s has all required fields', (_id, event) => {
      const e = event as EventType;
      expect(e.id).toBeTruthy();
      expect(e.name).toBeTruthy();
      expect(e.description).toBeTruthy();
      expect(['STRENGTH', 'ENDURANCE']).toContain(e.category);
      expect(e.scoringSystemId).toBeTruthy();
      expect(['WEIGHT', 'TIME', 'DISTANCE']).toContain(e.inputType);
      expect(e.unit).toBeTruthy();
      expect(typeof e.supportsReps).toBe('boolean');
    });

    it('every scoringSystemId references a valid scoring system', () => {
      const scoringIds = new Set(SCORING_SYSTEMS.map((s) => s.id));
      EVENT_TYPES.forEach((eventType) => {
        expect(scoringIds.has(eventType.scoringSystemId)).toBe(true);
      });
    });
  });

  describe('categories', () => {
    it('has STRENGTH events', () => {
      const strength = EVENT_TYPES.filter((e) => e.category === 'STRENGTH');
      expect(strength.length).toBeGreaterThan(0);
    });

    it('has ENDURANCE events', () => {
      const endurance = EVENT_TYPES.filter((e) => e.category === 'ENDURANCE');
      expect(endurance.length).toBeGreaterThan(0);
    });

    it('strength events use WEIGHT input type', () => {
      const strength = EVENT_TYPES.filter((e) => e.category === 'STRENGTH');
      strength.forEach((e) => expect(e.inputType).toBe('WEIGHT'));
    });
  });

  describe('reps configuration', () => {
    it('strength events support reps', () => {
      const strength = EVENT_TYPES.filter((e) => e.category === 'STRENGTH');
      strength.forEach((e) => {
        expect(e.supportsReps).toBe(true);
        expect(e.minReps).toBeGreaterThanOrEqual(1);
        expect(e.maxReps).toBeGreaterThan(e.minReps!);
      });
    });

    it('endurance events do not support reps', () => {
      const endurance = EVENT_TYPES.filter((e) => e.category === 'ENDURANCE');
      endurance.forEach((e) => {
        expect(e.supportsReps).toBe(false);
      });
    });
  });

  describe('getEventTypeById', () => {
    it('returns correct event type', () => {
      const squat = getEventTypeById('squat');
      expect(squat).toBeDefined();
      expect(squat!.name).toBe('Back Squat');
    });

    it('returns undefined for invalid ID', () => {
      expect(getEventTypeById('nonexistent')).toBeUndefined();
    });
  });

  describe('getEventTypesByCategory', () => {
    it('returns only STRENGTH events', () => {
      const strength = getEventTypesByCategory('STRENGTH');
      expect(strength.length).toBeGreaterThan(0);
      strength.forEach((e) => expect(e.category).toBe('STRENGTH'));
    });

    it('returns only ENDURANCE events', () => {
      const endurance = getEventTypesByCategory('ENDURANCE');
      expect(endurance.length).toBeGreaterThan(0);
      endurance.forEach((e) => expect(e.category).toBe('ENDURANCE'));
    });
  });
});
