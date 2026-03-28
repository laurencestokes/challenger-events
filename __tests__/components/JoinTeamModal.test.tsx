import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JoinTeamModal from '../../components/JoinTeamModal';

const mockPost = jest.fn();
jest.mock('../../lib/api-client', () => ({
  api: {
    post: (...args: any[]) => mockPost(...args),
  },
}));

describe('JoinTeamModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<JoinTeamModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Join Team by Code')).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    render(<JoinTeamModal {...defaultProps} />);
    expect(screen.getByText('Join Team by Code')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/team code/i)).toBeInTheDocument();
  });

  it('uppercases input', () => {
    render(<JoinTeamModal {...defaultProps} />);
    const input = screen.getByPlaceholderText(/team code/i);
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(input).toHaveValue('ABC');
  });

  it('shows validation error on empty submit', () => {
    render(<JoinTeamModal {...defaultProps} />);
    fireEvent.submit(screen.getByPlaceholderText(/team code/i).closest('form')!);
    expect(screen.getByText('Please enter a team code')).toBeInTheDocument();
  });

  it('calls api.post on valid submit', async () => {
    mockPost.mockResolvedValue({ message: 'Joined!' });
    render(<JoinTeamModal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText(/team code/i), {
      target: { value: 'TEAM1' },
    });
    fireEvent.submit(screen.getByPlaceholderText(/team code/i).closest('form')!);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/teams/join-by-code', {
        teamCode: 'TEAM1',
      });
    });
  });

  it('calls onSuccess and onClose after successful join', async () => {
    mockPost.mockResolvedValue({ message: 'Joined!' });
    render(<JoinTeamModal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText(/team code/i), {
      target: { value: 'XYZ' },
    });
    fireEvent.submit(screen.getByPlaceholderText(/team code/i).closest('form')!);

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('shows error on API failure', async () => {
    mockPost.mockRejectedValue(new Error('Team not found'));
    render(<JoinTeamModal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText(/team code/i), {
      target: { value: 'BAD' },
    });
    fireEvent.submit(screen.getByPlaceholderText(/team code/i).closest('form')!);

    await waitFor(() => {
      expect(screen.getByText('Team not found')).toBeInTheDocument();
    });
  });

  it('resets state when closed via Cancel', () => {
    render(<JoinTeamModal {...defaultProps} />);
    fireEvent.change(screen.getByPlaceholderText(/team code/i), {
      target: { value: 'SOME' },
    });
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
