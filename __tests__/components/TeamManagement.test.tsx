import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TeamManagement from '../../components/TeamManagement';

const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('../../lib/api-client', () => ({
  api: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
}));

describe('TeamManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockImplementation((url: string) => {
      if (url.includes('debug-participation')) {
        return Promise.resolve({ participation: null });
      }
      return Promise.resolve({
        teams: [
          { id: 't1', name: 'Team Alpha', description: 'First team', createdAt: new Date() },
          { id: 't2', name: 'Team Beta', description: '', createdAt: new Date() },
        ],
      });
    });
  });

  it('shows loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    const { container } = render(<TeamManagement eventId="e1" />);
    expect(
      container.querySelector('.animate-spin') || container.textContent?.includes('Loading'),
    ).toBeTruthy();
  });

  it('renders teams after loading', async () => {
    render(<TeamManagement eventId="e1" />);
    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
    });
  });

  it('fetches teams on mount', async () => {
    render(<TeamManagement eventId="e1" />);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/api/teams');
    });
  });

  it('fetches current team selection when eventId provided', async () => {
    render(<TeamManagement eventId="e1" />);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/api/events/e1/debug-participation');
    });
  });

  it('shows error on fetch failure', async () => {
    mockGet.mockRejectedValue(new Error('Failed to fetch teams'));
    render(<TeamManagement />);
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch teams/)).toBeInTheDocument();
    });
  });

  it('shows create button when no teams available', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('debug-participation')) return Promise.resolve({ participation: null });
      return Promise.resolve({ teams: [] });
    });
    render(<TeamManagement eventId="e1" />);
    await waitFor(() => {
      expect(screen.getByText(/Create First Team/i)).toBeInTheDocument();
    });
  });

  it('highlights selected team from participation', async () => {
    mockGet.mockImplementation((url: string) => {
      if (url.includes('debug-participation'))
        return Promise.resolve({ participation: { teamId: 't1' } });
      return Promise.resolve({
        teams: [
          { id: 't1', name: 'Team Alpha', createdAt: new Date() },
          { id: 't2', name: 'Team Beta', createdAt: new Date() },
        ],
      });
    });
    const { container } = render(<TeamManagement eventId="e1" />);
    await waitFor(() => {
      expect(container.textContent).toContain('Team Alpha');
      expect(container.textContent).toContain('Team Beta');
    });
  });

  it('renders without eventId', async () => {
    mockGet.mockResolvedValue({ teams: [{ id: 't1', name: 'Team One', createdAt: new Date() }] });
    const { container } = render(<TeamManagement />);
    await waitFor(() => {
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('calls onTeamJoined callback when team is clicked', async () => {
    const onTeamJoined = jest.fn();
    mockGet.mockImplementation((url: string) => {
      if (url.includes('debug-participation')) return Promise.resolve({ participation: null });
      return Promise.resolve({ teams: [{ id: 't1', name: 'Team Alpha', createdAt: new Date() }] });
    });
    mockPost.mockResolvedValue({});
    render(<TeamManagement eventId="e1" onTeamJoined={onTeamJoined} />);
    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    });
    // Click the team to select it
    fireEvent.click(screen.getByText('Team Alpha'));
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/events/e1/join-team', { teamId: 't1' });
    });
  });
});
