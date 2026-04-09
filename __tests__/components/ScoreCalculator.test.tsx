import React from 'react';
import { render, screen } from '@testing-library/react';
import ScoreCalculator from '../../components/ScoreCalculator';

const mockGet = jest.fn();
jest.mock('../../lib/api-client', () => ({
  api: { get: (...args: any[]) => mockGet(...args) },
}));

jest.mock('@challengerco/challenger-data', () => ({
  ChallengerData: jest.fn().mockImplementation(() => ({
    squatScore: jest.fn().mockReturnValue({ score: 450 }),
    benchScore: jest.fn().mockReturnValue({ score: 380 }),
    deadliftScore: jest.fn().mockReturnValue({ score: 500 }),
    rowing500mScore: jest.fn().mockReturnValue({ score: 420 }),
    rowing4minScore: jest.fn().mockReturnValue({ score: 410 }),
    bike4kmScore: jest.fn().mockReturnValue({ score: 390 }),
    ski500mScore: jest.fn().mockReturnValue({ score: 400 }),
    bike500mScore: jest.fn().mockReturnValue({ score: 395 }),
    bike10kmScore: jest.fn().mockReturnValue({ score: 385 }),
    ski1kmScore: jest.fn().mockReturnValue({ score: 405 }),
    running1mileScore: jest.fn().mockReturnValue({ score: 440 }),
  })),
  paceToWatts: jest.fn(),
}));

const mockAuth = { user: null as any };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

const activities = [
  { id: 'act1', name: 'Back Squat', type: 'WEIGHT' as const, unit: 'kg', scoringSystemId: 'squat' },
  {
    id: 'act2',
    name: '500m Row',
    type: 'TIME' as const,
    unit: 'seconds',
    scoringSystemId: 'rowing_500m',
  },
];

describe('ScoreCalculator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.user = { id: 'u1', bodyweight: 80, dateOfBirth: '1995-01-01', sex: 'M' };
  });

  it('renders calculator for each activity', () => {
    render(<ScoreCalculator activities={activities} />);
    expect(screen.getByText('Back Squat')).toBeInTheDocument();
    expect(screen.getByText('500m Row')).toBeInTheDocument();
  });

  it('renders input fields for activities', () => {
    render(<ScoreCalculator activities={activities} />);
    const inputs = document.querySelectorAll('input[type="number"], input[type="text"]');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('renders with empty activities', () => {
    const { container } = render(<ScoreCalculator activities={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with userProfileOverride', () => {
    render(
      <ScoreCalculator
        activities={activities}
        userProfileOverride={{
          bodyweight: 75,
          dateOfBirth: '1990-01-01',
          sex: 'F',
          competitionVerification: { bodyweight: 74, status: 'VERIFIED' },
          profileBodyweight: 75,
        }}
      />,
    );
    // Should show competition weight info
    const { container } = render(
      <ScoreCalculator
        activities={activities}
        userProfileOverride={{
          bodyweight: 75,
          dateOfBirth: '1990-01-01',
          sex: 'F',
          competitionVerification: null,
          profileBodyweight: 75,
        }}
      />,
    );
    expect(container.firstChild).toBeInTheDocument();
  });

  it('shows units for activities', () => {
    const { container } = render(<ScoreCalculator activities={activities} />);
    expect(container.textContent).toContain('kg');
  });

  it('renders with all activity types', () => {
    const allActivities = [
      { id: 'a1', name: 'Squat', type: 'WEIGHT' as const, unit: 'kg', scoringSystemId: 'squat' },
      {
        id: 'a2',
        name: 'Row',
        type: 'TIME' as const,
        unit: 'seconds',
        scoringSystemId: 'rowing_500m',
      },
      {
        id: 'a3',
        name: '4min Row',
        type: 'DISTANCE' as const,
        unit: 'm',
        scoringSystemId: 'rowing_4min',
      },
      { id: 'a4', name: 'Bench', type: 'WEIGHT' as const, unit: 'kg', scoringSystemId: 'bench' },
      {
        id: 'a5',
        name: 'Deadlift',
        type: 'WEIGHT' as const,
        unit: 'kg',
        scoringSystemId: 'deadlift',
      },
      {
        id: 'a6',
        name: 'Bike',
        type: 'TIME' as const,
        unit: 'seconds',
        scoringSystemId: 'bike_4km',
      },
    ];
    const { container } = render(<ScoreCalculator activities={allActivities} />);
    expect(container.querySelectorAll('input').length).toBeGreaterThanOrEqual(6);
  });

  it('renders with activities that have reps config', () => {
    const repsActivities = [
      {
        id: 'a1',
        name: 'Squat',
        type: 'WEIGHT' as const,
        unit: 'kg',
        scoringSystemId: 'squat',
        reps: 5,
        minReps: 1,
        maxReps: 10,
        defaultReps: 1,
      },
    ];
    const { container } = render(<ScoreCalculator activities={repsActivities} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders user profile info from auth context', () => {
    mockAuth.user = { id: 'u1', bodyweight: 80, dateOfBirth: '1995-01-01', sex: 'M' };
    const { container } = render(<ScoreCalculator activities={activities} />);
    expect(container.textContent).toContain('80'); // bodyweight
  });

  it('renders with female user', () => {
    mockAuth.user = { id: 'u1', bodyweight: 60, dateOfBirth: '2000-06-01', sex: 'F' };
    const { container } = render(<ScoreCalculator activities={activities} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders with competition verification override', () => {
    const { container } = render(
      <ScoreCalculator
        activities={activities}
        userProfileOverride={{
          bodyweight: 74,
          dateOfBirth: '1990-01-01',
          sex: 'M',
          competitionVerification: { bodyweight: 73.5, status: 'VERIFIED' },
          profileBodyweight: 75,
        }}
      />,
    );
    // Should show verification info
    expect(container.textContent).toContain('75');
    expect(container.textContent).toContain('verified');
  });
});
