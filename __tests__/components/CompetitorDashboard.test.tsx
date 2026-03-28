import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import CompetitorDashboard from '../../components/CompetitorDashboard';

const mockGet = jest.fn();
jest.mock('../../lib/api-client', () => ({
  api: { get: (...args: any[]) => mockGet(...args) },
}));

const mockAuth = { user: null as any };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} />,
}));

// Mock recharts
jest.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
}));

jest.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'dark', resolvedTheme: 'dark' }),
}));

// Mock ChallengerData
jest.mock('@challengerco/challenger-data', () => ({
  ChallengerData: jest.fn().mockImplementation(() => ({})),
  paceToWatts: jest.fn(),
}));

describe('CompetitorDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.user = { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'COMPETITOR' };
  });

  it('shows loading skeletons initially', () => {
    mockGet.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<CompetitorDashboard />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('fetches scores and events on mount', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('all-scores')) return Promise.resolve({ scores: [], events: [] });
      if (url.includes('teams')) return Promise.resolve({ userTeams: [], availableTeams: [] });
      return Promise.resolve([]);
    });

    render(<CompetitorDashboard />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/api/user/all-scores');
    });
  });

  it('renders welcome section after loading', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('all-scores')) return Promise.resolve({ scores: [], events: [] });
      if (url.includes('teams')) return Promise.resolve({ userTeams: [], availableTeams: [] });
      return Promise.resolve([]);
    });

    render(<CompetitorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    });
  });

  it('handles fetch failure gracefully', async () => {
    mockGet.mockRejectedValue(new Error('Failed to load'));
    const { container } = render(<CompetitorDashboard />);

    await waitFor(() => {
      // Should render something (error or empty state) without crashing
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('does not fetch when user is null', () => {
    mockAuth.user = null;
    render(<CompetitorDashboard />);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('renders data after all fetches resolve', async () => {
    const event = {
      id: 'e1',
      name: 'Summer Comp',
      code: 'SUM',
      status: 'ACTIVE',
      joinedAt: '2026-01-01',
      scores: [],
      imageUrl: '/test.jpg',
      startDate: '2026-06-01',
      location: 'London',
    };
    mockGet.mockImplementation((url: string) => {
      if (url === '/api/user/all-scores') return Promise.resolve({ scores: [], events: [event] });
      if (url === '/api/events') return Promise.resolve([event]);
      if (url === '/api/user/events') return Promise.resolve([event]);
      if (url === '/api/events/available') return Promise.resolve([event]);
      if (url.includes('teams'))
        return Promise.resolve({ teams: [{ id: 't1', name: 'Team A', createdAt: new Date() }] });
      return Promise.resolve([]);
    });

    const { container } = render(<CompetitorDashboard />);

    await waitFor(() => {
      expect(container.textContent).toContain('Summer Comp');
    });
  });

  it('renders with empty events but has scores', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('all-scores')) {
        return Promise.resolve({
          scores: [
            {
              id: 's1',
              activityId: 'squat',
              testId: 'squat',
              rawScore: 140,
              rawValue: 140,
              calculatedScore: 450,
              reps: 1,
              timestamp: '2026-01-15',
              submittedAt: '2026-01-15',
              verified: true,
            },
          ],
          events: [],
        });
      }
      if (url.includes('teams')) return Promise.resolve({ userTeams: [], availableTeams: [] });
      return Promise.resolve([]);
    });

    render(<CompetitorDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Welcome Back')).toBeInTheDocument();
    });
  });
});
