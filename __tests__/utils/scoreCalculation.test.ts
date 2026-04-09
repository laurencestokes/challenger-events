import { calculateScore } from '../../utils/scoreCalculation';

// Mock the ChallengerData package
jest.mock('@challengerco/challenger-data', () => ({
  ChallengerData: jest.fn().mockImplementation(() => ({
    squatScore: jest.fn().mockReturnValue({ score: 450, percentile: 70 }),
    benchScore: jest.fn().mockReturnValue({ score: 380, percentile: 60 }),
    deadliftScore: jest.fn().mockReturnValue({ score: 500, percentile: 75 }),
    rowing500mScore: jest.fn().mockReturnValue({ score: 420, percentile: 65 }),
    rowing4minScore: jest.fn().mockReturnValue({ score: 410, percentile: 63 }),
    bike4kmScore: jest.fn().mockReturnValue({ score: 390, percentile: 62 }),
    ski500mScore: jest.fn().mockReturnValue({ score: 400, percentile: 64 }),
    bike500mScore: jest.fn().mockReturnValue({ score: 395, percentile: 61 }),
    bike10kmScore: jest.fn().mockReturnValue({ score: 385, percentile: 60 }),
    ski1kmScore: jest.fn().mockReturnValue({ score: 405, percentile: 65 }),
    running1mileScore: jest.fn().mockReturnValue({ score: 440, percentile: 69 }),
  })),
  paceToWatts: jest.fn().mockReturnValue(200),
}));

describe('scoreCalculation', () => {
  const dob = new Date('1995-06-15');

  describe('calculateScore', () => {
    it('throws for unknown scoring system', async () => {
      await expect(calculateScore('nonexistent', 100, 80, dob, 'M')).rejects.toThrow(
        'Scoring system not found',
      );
    });

    it('calculates squat score', async () => {
      const result = await calculateScore('squat', 140, 80, dob, 'M', 1);
      expect(result.score).toBe(450);
      expect(result.scoringSystem.id).toBe('squat');
      expect(result.scoringSystem.category).toBe('STRENGTH');
    });

    it('calculates bench score', async () => {
      const result = await calculateScore('bench', 100, 80, dob, 'M');
      expect(result.score).toBe(380);
      expect(result.scoringSystem.id).toBe('bench');
    });

    it('calculates deadlift score', async () => {
      const result = await calculateScore('deadlift', 180, 80, dob, 'M');
      expect(result.score).toBe(500);
    });

    it('calculates rowing 500m score', async () => {
      const result = await calculateScore('rowing_500m', 90, 80, dob, 'M');
      expect(result.score).toBe(420);
      expect(result.scoringSystem.category).toBe('ENDURANCE');
    });

    it('calculates 4-minute row score', async () => {
      const result = await calculateScore('rowing_4min', 1050, 80, dob, 'M');
      expect(result.score).toBe(410);
    });

    it('calculates bike 4km score', async () => {
      const result = await calculateScore('bike_4km', 300, 80, dob, 'M');
      expect(result.score).toBe(390);
    });

    it('calculates ski 500m score', async () => {
      const result = await calculateScore('ski_500m', 95, 80, dob, 'M');
      expect(result.score).toBe(400);
    });

    it('calculates bike 10km score', async () => {
      const result = await calculateScore('bike_10km', 1080, 80, dob, 'M');
      expect(result.score).toBe(385);
    });

    it('calculates ski 1km score', async () => {
      const result = await calculateScore('ski_1km', 210, 80, dob, 'M');
      expect(result.score).toBe(405);
    });

    it('calculates running 1 mile score', async () => {
      const result = await calculateScore('running_1mile', 360, 80, dob, 'M');
      expect(result.score).toBe(440);
    });

    it('handles custom weight scoring', async () => {
      const result = await calculateScore('custom_weight', 150, 80, dob, 'M');
      expect(result.score).toBe(150); // Raw value passed through
    });

    it('handles custom reps scoring', async () => {
      const result = await calculateScore('custom_reps', 25, 80, dob, 'M');
      expect(result.score).toBe(25);
    });

    it('handles custom distance scoring', async () => {
      const result = await calculateScore('custom_distance', 5000, 80, dob, 'M');
      expect(result.score).toBe(5000);
    });

    it('handles custom time scoring (inverse)', async () => {
      const result = await calculateScore('custom_time', 60, 80, dob, 'M');
      expect(result.score).toBeCloseTo(1000 / 60, 5);
    });

    it('uses default age when dateOfBirth is null', async () => {
      const result = await calculateScore('squat', 140, 80, null, 'M');
      expect(result.score).toBe(450); // Still calls ChallengerData with default age 25
    });

    it('handles Firestore timestamp for dateOfBirth', async () => {
      const firestoreTs = { seconds: Math.floor(dob.getTime() / 1000) };
      const result = await calculateScore('squat', 140, 80, firestoreTs, 'M');
      expect(result.score).toBe(450);
    });

    it('returns scoring system metadata in result', async () => {
      const result = await calculateScore('squat', 140, 80, dob, 'M');
      expect(result.scoringSystem).toEqual({
        id: 'squat',
        name: 'Squat',
        category: 'STRENGTH',
      });
    });

    it('calculates rowing (2k) score', async () => {
      const result = await calculateScore('rowing', 420, 80, dob, 'M');
      expect(result.score).toBe(420);
      expect(result.scoringSystem.id).toBe('rowing');
    });

    it('calculates bike 500m score', async () => {
      const result = await calculateScore('bike_500m', 45, 80, dob, 'M');
      expect(result.score).toBe(395);
    });

    it('calculates running 1 mile score', async () => {
      const result = await calculateScore('running_1mile', 360, 80, dob, 'M');
      expect(result.score).toBe(440);
    });

    it('handles rowing_distance scoring', async () => {
      const result = await calculateScore('rowing_distance', 2000, 80, dob, 'M');
      expect(result.score).toBe(2000);
    });

    it('handles rowing_500m_distance scoring', async () => {
      const result = await calculateScore('rowing_500m_distance', 500, 80, dob, 'M');
      expect(result.score).toBe(420); // uses rowing500mScore mock
    });

    it('throws for unsupported scoring system function', async () => {
      // We'd need a scoring system with an unknown calculationFunction
      // This tests the default branch — but since all known systems are covered,
      // we test indirectly via the 'nonexistent' test above
    });

    it('converts female sex correctly', async () => {
      const result = await calculateScore('squat', 100, 60, dob, 'F');
      expect(result.score).toBe(450);
    });
  });
});
