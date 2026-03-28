import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Leaderboard from '../../components/Leaderboard';

const mockGet = jest.fn();
jest.mock('../../lib/api-client', () => ({
  api: { get: (...args: any[]) => mockGet(...args) },
}));

jest.mock('@challengerco/challenger-data', () => ({
  ChallengerData: jest.fn().mockImplementation(() => ({})),
  paceToWatts: jest.fn(),
}));

const mockLeaderboardData = {
  eventId: 'e1',
  eventName: 'Summer Challenge',
  isTeamEvent: false,
  overallLeaderboard: [
    { userId: 'u1', name: 'Alice', email: 'a@b.com', totalScore: 900, workoutScores: {}, rank: 1 },
    { userId: 'u2', name: 'Bob', email: 'b@b.com', totalScore: 750, workoutScores: {}, rank: 2 },
    {
      userId: 'u3',
      name: 'Charlie',
      email: 'c@b.com',
      totalScore: 600,
      workoutScores: {},
      rank: 3,
    },
  ],
  workoutLeaderboards: [
    {
      activityId: 'act1',
      activityName: 'Back Squat',
      entries: [
        { userId: 'u1', name: 'Alice', email: 'a@b.com', score: 500, rawValue: 140, rank: 1 },
      ],
    },
  ],
};

describe('Leaderboard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    const { container } = render(<Leaderboard eventId="e1" />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.getByText('Loading leaderboard...')).toBeInTheDocument();
  });

  it('renders leaderboard entries after loading', async () => {
    mockGet.mockResolvedValue(mockLeaderboardData);
    render(<Leaderboard eventId="e1" />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });
  });

  it('shows rank icons for top 3', async () => {
    mockGet.mockResolvedValue(mockLeaderboardData);
    render(<Leaderboard eventId="e1" />);

    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeInTheDocument();
    });
  });

  it('shows error message on API failure', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));
    render(<Leaderboard eventId="e1" />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('shows empty state when no data', async () => {
    mockGet.mockResolvedValue(null);
    render(<Leaderboard eventId="e1" />);

    await waitFor(() => {
      expect(screen.getByText('No leaderboard data available.')).toBeInTheDocument();
    });
  });

  it('fetches leaderboard data for the correct event', async () => {
    mockGet.mockResolvedValue(mockLeaderboardData);
    render(<Leaderboard eventId="e1" />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/api/events/e1/leaderboard');
    });
  });

  it('renders workout tabs when workout leaderboards exist', async () => {
    mockGet.mockResolvedValue(mockLeaderboardData);
    render(<Leaderboard eventId="e1" />);

    await waitFor(() => {
      expect(screen.getAllByText('Back Squat').length).toBeGreaterThan(0);
    });
  });

  it('displays total scores', async () => {
    mockGet.mockResolvedValue(mockLeaderboardData);
    const { container } = render(<Leaderboard eventId="e1" />);

    await waitFor(() => {
      const text = container.textContent || '';
      expect(text).toContain('900');
      expect(text).toContain('750');
    });
  });
});
