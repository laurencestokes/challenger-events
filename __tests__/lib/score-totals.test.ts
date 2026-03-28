import { computeTotalsFromScores } from '../../lib/score-totals';
import { CANONICAL_EVENTS } from '../../constants/achievements';

describe('score-totals', () => {
  describe('computeTotalsFromScores', () => {
    it('returns 0 totals for empty inputs', () => {
      const result = computeTotalsFromScores([], []);
      expect(result.total).toBe(0);
      expect(result.verifiedTotal).toBe(0);
    });

    it('computes totals from personal scores', () => {
      const personalScores = CANONICAL_EVENTS.map((event) => ({
        activityId: event.id,
        calculatedScore: 500,
        verified: true,
      }));
      const result = computeTotalsFromScores(personalScores, []);
      expect(result.total).toBe(500);
      expect(result.verifiedTotal).toBe(500);
    });

    it('computes totals from event scores', () => {
      const userEvents = [
        {
          scores: CANONICAL_EVENTS.map((event) => ({
            activityId: event.id,
            calculatedScore: 400,
            verified: false,
          })),
        },
      ];
      const result = computeTotalsFromScores([], userEvents);
      // Event scores count as "verified" because they have an event object
      expect(result.total).toBe(400);
      expect(result.verifiedTotal).toBe(400);
    });

    it('combines personal and event scores taking highest', () => {
      // Personal score of 300 on first canonical event
      const personalScores = [
        {
          activityId: CANONICAL_EVENTS[0].id,
          calculatedScore: 300,
          verified: true,
        },
      ];
      // Event score of 500 on same event
      const userEvents = [
        {
          scores: [
            {
              activityId: CANONICAL_EVENTS[0].id,
              calculatedScore: 500,
              verified: false,
            },
          ],
        },
      ];
      const result = computeTotalsFromScores(personalScores, userEvents);
      // Should take 500 (highest) for that event, 0 for all others
      const expected = Math.round(500 / CANONICAL_EVENTS.length);
      expect(result.total).toBe(expected);
    });

    it('handles events with no scores', () => {
      const userEvents = [{ scores: [] }, { scores: undefined as any }];
      const result = computeTotalsFromScores([], userEvents);
      expect(result.total).toBe(0);
    });

    it('unverified personal scores count in total but not verifiedTotal', () => {
      const personalScores = CANONICAL_EVENTS.map((event) => ({
        activityId: event.id,
        calculatedScore: 600,
        verified: false,
      }));
      const result = computeTotalsFromScores(personalScores, []);
      expect(result.total).toBe(600); // Overall includes unverified
      expect(result.verifiedTotal).toBe(0); // Verified excludes unverified without event
    });
  });
});
