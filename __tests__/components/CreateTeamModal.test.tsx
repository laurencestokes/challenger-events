import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CreateTeamModal from '../../components/CreateTeamModal';

const mockPost = jest.fn();
jest.mock('../../lib/api-client', () => ({
  api: {
    post: (...args: any[]) => mockPost(...args),
  },
}));

const mockAuth = { user: null as any };
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuth,
}));

describe('CreateTeamModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.user = { id: 'u1', role: 'COMPETITOR' };
  });

  it('renders nothing when closed', () => {
    render(<CreateTeamModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Create Team')).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    render(<CreateTeamModal {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Create Team' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter team name')).toBeInTheDocument();
  });

  it('shows validation error on empty name submit', () => {
    render(<CreateTeamModal {...defaultProps} />);
    fireEvent.submit(screen.getByPlaceholderText('Enter team name').closest('form')!);
    expect(screen.getByText('Please enter a team name')).toBeInTheDocument();
  });

  it('submits team creation with name and description', async () => {
    mockPost.mockResolvedValue({ team: { id: 't1', name: 'My Team' } });
    render(<CreateTeamModal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Enter team name'), {
      target: { value: 'My Team' },
    });
    fireEvent.change(screen.getByPlaceholderText('Enter team description'), {
      target: { value: 'Best team' },
    });
    fireEvent.submit(screen.getByPlaceholderText('Enter team name').closest('form')!);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/teams', {
        name: 'My Team',
        description: 'Best team',
        scope: 'INVITE_ONLY',
      });
    });
  });

  it('calls onSuccess and onClose on successful creation', async () => {
    mockPost.mockResolvedValue({ team: { id: 't1' } });
    render(<CreateTeamModal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Enter team name'), {
      target: { value: 'New Team' },
    });
    fireEvent.submit(screen.getByPlaceholderText('Enter team name').closest('form')!);

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('shows error on API failure', async () => {
    mockPost.mockRejectedValue(new Error('Name already taken'));
    render(<CreateTeamModal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText('Enter team name'), {
      target: { value: 'Duplicate' },
    });
    fireEvent.submit(screen.getByPlaceholderText('Enter team name').closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Name already taken')).toBeInTheDocument();
    });
  });

  it('does not show scope selector for non-admin users', () => {
    mockAuth.user = { id: 'u1', role: 'COMPETITOR' };
    render(<CreateTeamModal {...defaultProps} />);
    expect(screen.queryByText('Team Scope')).not.toBeInTheDocument();
  });

  it('shows scope selector for admin users', () => {
    mockAuth.user = { id: 'u1', role: 'ADMIN' };
    render(<CreateTeamModal {...defaultProps} />);
    expect(screen.getByText('Team Scope')).toBeInTheDocument();
  });

  it('shows scope selector for super admin users', () => {
    mockAuth.user = { id: 'u1', role: 'SUPER_ADMIN' };
    render(<CreateTeamModal {...defaultProps} />);
    expect(screen.getByText('Team Scope')).toBeInTheDocument();
  });

  it('resets form on Cancel', () => {
    render(<CreateTeamModal {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText('Enter team name'), {
      target: { value: 'Draft Team' },
    });
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
