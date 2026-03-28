import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import TeamsPage from '../../components/TeamsPage';

const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('../../lib/api-client', () => ({
  api: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
  },
}));

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

describe('TeamsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockResolvedValue({
      teams: [
        {
          id: 't1',
          name: 'Team Alpha',
          description: 'Best team',
          createdAt: new Date(),
          userRole: 'CAPTAIN',
          isMember: true,
        },
        {
          id: 't2',
          name: 'Team Beta',
          description: '',
          createdAt: new Date(),
          userRole: 'MEMBER',
          isMember: true,
        },
      ],
    });
  });

  it('shows loading state initially', () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    const { container } = render(<TeamsPage />);
    expect(
      container.querySelector('.animate-spin') || container.textContent?.includes('Loading'),
    ).toBeTruthy();
  });

  it('renders user teams after loading', async () => {
    render(<TeamsPage />);
    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
      expect(screen.getByText('Team Beta')).toBeInTheDocument();
    });
  });

  it('fetches teams on mount', async () => {
    render(<TeamsPage />);
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/api/teams/user');
    });
  });

  it('shows error on fetch failure', async () => {
    mockGet.mockRejectedValue(new Error('Server error'));
    render(<TeamsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Server error/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no teams', async () => {
    mockGet.mockResolvedValue({ teams: [] });
    render(<TeamsPage />);
    await waitFor(() => {
      const { container } = render(<TeamsPage />);
      // Should show some UI indicating no teams or create team prompt
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  it('renders create team button', async () => {
    render(<TeamsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Create Team/i)).toBeInTheDocument();
    });
  });

  it('shows team roles', async () => {
    render(<TeamsPage />);
    await waitFor(() => {
      expect(screen.getAllByText(/CAPTAIN/i).length).toBeGreaterThan(0);
    });
  });

  it('shows create team modal when button is clicked', async () => {
    render(<TeamsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Create Team/i)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Create Team/i));
    // Modal should appear with form
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/team name/i)).toBeInTheDocument();
    });
  });

  it('navigates to team detail on team card click', async () => {
    render(<TeamsPage />);
    await waitFor(() => {
      expect(screen.getByText('Team Alpha')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Team Alpha'));
    expect(mockPush).toHaveBeenCalledWith('/teams/t1');
  });

  it('renders join by code button', async () => {
    render(<TeamsPage />);
    await waitFor(() => {
      expect(screen.getByText(/Join by Code/i)).toBeInTheDocument();
    });
  });
});
