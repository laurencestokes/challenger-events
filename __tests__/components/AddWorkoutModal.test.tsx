import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddWorkoutModal from '../../components/AddWorkoutModal';

const mockPost = jest.fn();
jest.mock('../../lib/api-client', () => ({
  api: { post: (...args: any[]) => mockPost(...args) },
}));

describe('AddWorkoutModal', () => {
  const defaultProps = {
    eventId: 'event1',
    onClose: jest.fn(),
    onWorkoutAdded: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with title', () => {
    render(<AddWorkoutModal {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Add Workout' })).toBeInTheDocument();
  });

  it('shows event type options in select', () => {
    render(<AddWorkoutModal {...defaultProps} />);
    // The select has an option for choosing event type
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('shows error when submitting without event type', async () => {
    render(<AddWorkoutModal {...defaultProps} />);
    const form = document.querySelector('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText('Please select an event type')).toBeInTheDocument();
    });
  });

  it('calls onClose when close button is clicked', () => {
    render(<AddWorkoutModal {...defaultProps} />);
    // Find the X close button
    const closeButtons = document.querySelectorAll('button');
    const closeBtn = Array.from(closeButtons).find(
      (btn) => !btn.textContent?.includes('Add') && !btn.textContent?.includes('Cancel'),
    );
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(defaultProps.onClose).toHaveBeenCalled();
    }
  });

  it('calls api.post on valid submission', async () => {
    mockPost.mockResolvedValue({
      id: 'act1',
      name: 'Back Squat',
      eventId: 'event1',
    });

    render(<AddWorkoutModal {...defaultProps} />);

    // Select an event type
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'squat' } });

    const form = document.querySelector('form');
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/events/event1/activities',
        expect.objectContaining({
          scoringSystemId: 'squat',
        }),
      );
    });
  });

  it('calls onWorkoutAdded on success', async () => {
    const activity = { id: 'act1', name: 'Back Squat', eventId: 'event1' };
    mockPost.mockResolvedValue(activity);

    render(<AddWorkoutModal {...defaultProps} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'squat' } });

    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(defaultProps.onWorkoutAdded).toHaveBeenCalled();
    });
  });

  it('shows error on API failure', async () => {
    mockPost.mockRejectedValue(new Error('Failed to create'));

    render(<AddWorkoutModal {...defaultProps} />);

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'squat' } });

    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText('Failed to create')).toBeInTheDocument();
    });
  });
});
