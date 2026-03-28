import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EditWorkoutModal from '../../components/EditWorkoutModal';

const mockPut = jest.fn();
jest.mock('../../lib/api-client', () => ({
  api: { put: (...args: any[]) => mockPut(...args) },
}));

const baseActivity = {
  id: 'act1',
  eventId: 'event1',
  name: 'Back Squat',
  description: 'Test squat',
  type: 'WEIGHT' as const,
  scoringSystemId: 'squat',
  unit: 'kg',
  order: 1,
  isHidden: false,
  createdAt: new Date(),
};

describe('EditWorkoutModal', () => {
  const defaultProps = {
    activity: baseActivity,
    eventId: 'event1',
    onClose: jest.fn(),
    onWorkoutUpdated: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders with pre-filled data', () => {
    render(<EditWorkoutModal {...defaultProps} />);
    expect(screen.getByText('Edit Workout')).toBeInTheDocument();
    // Name appears in both the select option and the name input
    expect(screen.getByLabelText('Workout Name')).toHaveValue('Back Squat');
    expect(screen.getByDisplayValue('Test squat')).toBeInTheDocument();
  });

  it('shows error when no event type selected', async () => {
    render(
      <EditWorkoutModal
        {...defaultProps}
        activity={{ ...baseActivity, scoringSystemId: undefined }}
      />,
    );
    const select = screen.getByLabelText(/Event Type/);
    fireEvent.change(select, { target: { value: '' } });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(screen.getByText('Please select an event type')).toBeInTheDocument();
    });
  });

  it('calls api.put on valid submit', async () => {
    mockPut.mockResolvedValue({});
    render(<EditWorkoutModal {...defaultProps} />);
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        '/api/events/event1/activities/act1',
        expect.objectContaining({ scoringSystemId: 'squat' }),
      );
    });
  });

  it('calls onWorkoutUpdated on success', async () => {
    mockPut.mockResolvedValue({});
    render(<EditWorkoutModal {...defaultProps} />);
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(defaultProps.onWorkoutUpdated).toHaveBeenCalled();
    });
  });

  it('shows error on API failure', async () => {
    mockPut.mockRejectedValue(new Error('Update failed'));
    render(<EditWorkoutModal {...defaultProps} />);
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<EditWorkoutModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('updates name when event type changes', () => {
    render(<EditWorkoutModal {...defaultProps} />);
    const select = screen.getByLabelText(/Event Type/);
    fireEvent.change(select, { target: { value: 'bench' } });
    expect(screen.getByLabelText('Workout Name')).toHaveValue('Bench Press');
  });

  it('shows hidden workout checkbox', () => {
    render(<EditWorkoutModal {...defaultProps} />);
    expect(screen.getByLabelText('Hidden Workout')).toBeInTheDocument();
  });

  it('shows warning when hidden is checked', () => {
    render(<EditWorkoutModal {...defaultProps} activity={{ ...baseActivity, isHidden: true }} />);
    expect(screen.getByText(/hidden from competitors/)).toBeInTheDocument();
  });
});
