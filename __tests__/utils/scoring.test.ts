import { calculateGaussianScore, convertSex } from '../../utils/scoring'

// Mock the ChallengerData package
jest.mock('@challengerco/challenger-data', () => ({
    ChallengerData: jest.fn().mockImplementation(() => ({
        squatScore: jest.fn().mockReturnValue({ score: 100, percentile: 50 }),
        benchScore: jest.fn().mockReturnValue({ score: 80, percentile: 40 }),
        deadliftScore: jest.fn().mockReturnValue({ score: 120, percentile: 60 }),
        rowingScore: jest.fn().mockReturnValue({ score: 90, percentile: 45 }),
    })),
}))

describe('Scoring Utilities', () => {
    describe('calculateGaussianScore', () => {
        it('should calculate gaussian score correctly', () => {
            const score = calculateGaussianScore(100, 100, 10)
            expect(score).toBeGreaterThan(0)
            expect(score).toBeLessThanOrEqual(1)
        })

        it('should return 1 for exact mean match', () => {
            const score = calculateGaussianScore(100, 100, 10)
            expect(score).toBeCloseTo(1, 5)
        })

        it('should return lower score for values far from mean', () => {
            const score1 = calculateGaussianScore(100, 100, 10)
            const score2 = calculateGaussianScore(150, 100, 10)
            expect(score1).toBeGreaterThan(score2)
        })
    })

    describe('convertSex', () => {
        it('should convert M to male', () => {
            expect(convertSex('M')).toBe('male')
        })

        it('should convert F to female', () => {
            expect(convertSex('F')).toBe('female')
        })
    })
}) 