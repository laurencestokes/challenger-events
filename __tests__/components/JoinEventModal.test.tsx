import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import JoinEventModal from '../../components/JoinEventModal';

// Mock api-client
const mockPost = jest.fn();
jest.mock('../../lib/api-client', () => ({
  api: {
    post: (...args: any[]) => mockPost(...args),
  },
}));

describe('JoinEventModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onSuccess: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<JoinEventModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Join Event')).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    render(<JoinEventModal {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Join Event' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/event code/i)).toBeInTheDocument();
  });

  it('uppercases input as user types', () => {
    render(<JoinEventModal {...defaultProps} />);
    const input = screen.getByPlaceholderText(/event code/i);
    fireEvent.change(input, { target: { value: 'abc123' } });
    expect(input).toHaveValue('ABC123');
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<JoinEventModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls api.post with uppercased code on submit', async () => {
    mockPost.mockResolvedValue({ message: 'Joined successfully' });
    render(<JoinEventModal {...defaultProps} />);

    const input = screen.getByPlaceholderText(/event code/i);
    fireEvent.change(input, { target: { value: 'test99' } });
    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/api/events/join', {
        eventCode: 'TEST99',
      });
    });
  });

  it('calls onSuccess and onClose after successful join', async () => {
    mockPost.mockResolvedValue({ message: 'Joined!' });
    render(<JoinEventModal {...defaultProps} />);

    fireEvent.change(screen.getByPlaceholderText(/event code/i), {
      target: { value: 'ABC123' },
    });
    fireEvent.submit(screen.getByPlaceholderText(/event code/i).closest('form')!);

    await waitFor(() => {
      expect(defaultProps.onSuccess).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('disables submit button when input is empty', () => {
    render(<JoinEventModal {...defaultProps} />);
    const submitBtns = screen.getAllByText('Join Event');
    const submitBtn = submitBtns.find((el) => el.closest('button[type="submit"]'));
    expect(submitBtn?.closest('button')).toBeDisabled();
  });
});
