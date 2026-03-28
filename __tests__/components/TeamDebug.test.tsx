import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TeamDebug from '../../components/TeamDebug';

const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('../../lib/api-client', () => ({
  api: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
}));

describe('TeamDebug', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders debug panel', () => {
    render(<TeamDebug eventId="e1" />);
    expect(screen.getByText('Team Participation Debug')).toBeInTheDocument();
    expect(screen.getByText('Check Participation')).toBeInTheDocument();
    expect(screen.getByText('Fix Team Participation')).toBeInTheDocument();
  });

  it('fetches and displays debug data', async () => {
    mockGet.mockResolvedValue({
      user: { id: 'u1', name: 'Alice', email: 'alice@test.com' },
      event: { id: 'e1', name: 'Summer Comp', isTeamEvent: true },
      participation: { id: 'p1', userId: 'u1', eventId: 'e1', teamId: 't1', joinedAt: new Date() },
      userTeams: [{ id: 't1', name: 'Team Alpha', members: [{ userId: 'u1', role: 'CAPTAIN' }] }],
    });

    render(<TeamDebug eventId="e1" />);
    fireEvent.click(screen.getByText('Check Participation'));

    await waitFor(() => {
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/Summer Comp/)).toBeInTheDocument();
      expect(screen.getByText(/Participating/)).toBeInTheDocument();
      expect(screen.getByText(/Team Alpha/)).toBeInTheDocument();
    });
  });

  it('shows not participating when no participation', async () => {
    mockGet.mockResolvedValue({
      user: { id: 'u1', name: 'Bob', email: 'bob@test.com' },
      event: { id: 'e1', name: 'Test', isTeamEvent: false },
      participation: null,
      userTeams: [],
    });

    render(<TeamDebug eventId="e1" />);
    fireEvent.click(screen.getByText('Check Participation'));

    await waitFor(() => {
      expect(screen.getByText(/Not participating/)).toBeInTheDocument();
      expect(screen.getByText(/No teams/)).toBeInTheDocument();
    });
  });

  it('shows error on fetch failure', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));
    render(<TeamDebug eventId="e1" />);
    fireEvent.click(screen.getByText('Check Participation'));

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('calls fix endpoint', async () => {
    mockPost.mockResolvedValue({ message: 'Fixed 2 participations' });
    // After fix, checkParticipation is called which uses mockGet
    mockGet.mockResolvedValue({
      user: { id: 'u1', name: 'Alice', email: 'a@b.com' },
      event: { id: 'e1', name: 'Test', isTeamEvent: true },
      participation: null,
      userTeams: [],
    });

    render(<TeamDebug eventId="e1" />);
    fireEvent.click(screen.getByText('Fix Team Participation'));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/events/e1/fix-team-participation', {});
    });
  });
});
