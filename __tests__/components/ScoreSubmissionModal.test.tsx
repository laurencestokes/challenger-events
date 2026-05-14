import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ScoreSubmissionModal from '../../components/ScoreSubmissionModal';

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
jest.mock('../../lib/api-client', () => ({
  api: {
    get: (...args: any[]) => mockGet(...args),
    post: (...args: any[]) => mockPost(...args),
    put: (...args: any[]) => mockPut(...args),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

// Mock ChallengerData to avoid ESM import issues
jest.mock('@challengerco/challenger-data', () => ({
  ChallengerData: jest.fn().mockImplementation(() => ({})),
  paceToWatts: jest.fn().mockReturnValue(200),
}));

describe('ScoreSubmissionModal', () => {
  const defaultProps = {
    eventId: 'event1',
    isOpen: true,
    onClose: jest.fn(),
    onScoreSubmitted: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock fetching event data
    mockGet.mockImplementation((url: string) => {
      if (url.includes('/activities')) {
        return Promise.resolve([
          { id: 'act1', name: 'Back Squat', type: 'WEIGHT', unit: 'kg', scoringSystemId: 'squat' },
          {
            id: 'act2',
            name: '500m Row',
            type: 'TIME',
            unit: 'seconds',
            scoringSystemId: 'rowing_500m',
          },
        ]);
      }
      if (url.includes('/competition-verification')) {
        return Promise.resolve({ verifications: [] });
      }
      // Event data
      return Promise.resolve({
        participants: [
          {
            id: 'u1',
            name: 'Alice',
            email: 'alice@test.com',
            bodyweight: 65,
            dateOfBirth: '1995-01-01',
            sex: 'F',
          },
          {
            id: 'u2',
            name: 'Bob',
            email: 'bob@test.com',
            bodyweight: 80,
            dateOfBirth: '1990-06-15',
            sex: 'M',
          },
        ],
        isTeamEvent: false,
      });
    });
  });

  it('renders nothing when closed', () => {
    renderWithClient(<ScoreSubmissionModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Submit Score')).not.toBeInTheDocument();
  });

  it('renders modal when open', async () => {
    renderWithClient(<ScoreSubmissionModal {...defaultProps} />);
    expect(screen.getByRole('heading', { name: 'Submit Score' })).toBeInTheDocument();
  });

  it('fetches event data on open', async () => {
    renderWithClient(<ScoreSubmissionModal {...defaultProps} />);

    await waitFor(() => {
      expect(mockGet).toHaveBeenCalledWith('/api/events/event1');
      expect(mockGet).toHaveBeenCalledWith('/api/events/event1/activities');
    });
  });

  it('populates competitor dropdown', async () => {
    renderWithClient(<ScoreSubmissionModal {...defaultProps} />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/events/event1'));

    // Open the typeahead list
    fireEvent.focus(screen.getByLabelText(/Competitor/));

    await waitFor(() => {
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/Bob/)).toBeInTheDocument();
    });
  });

  it('populates workout dropdown', async () => {
    renderWithClient(<ScoreSubmissionModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Back Squat')).toBeInTheDocument();
      expect(screen.getByText('500m Row')).toBeInTheDocument();
    });
  });

  it('shows validation error when fields are empty', async () => {
    renderWithClient(<ScoreSubmissionModal {...defaultProps} />);

    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    fireEvent.submit(document.querySelector('form')!);
    expect(screen.getByText('Please fill in all required fields')).toBeInTheDocument();
  });

  it('submits score successfully', async () => {
    mockPost.mockResolvedValue({ score: { id: 's1' } });
    renderWithClient(<ScoreSubmissionModal {...defaultProps} />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/events/event1'));

    // Open the competitor typeahead and pick Alice via mousedown (matches component handler)
    fireEvent.focus(screen.getByLabelText(/Competitor/));
    await waitFor(() => expect(screen.getByText(/Alice/)).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByText(/Alice/));

    // Select activity
    fireEvent.change(screen.getByLabelText(/Workout/), { target: { value: 'act1' } });

    // Enter score
    fireEvent.change(screen.getByLabelText(/Score/), { target: { value: '100' } });

    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/api/scores',
        expect.objectContaining({
          eventId: 'event1',
          competitorId: 'u1',
          activityId: 'act1',
          rawValue: 100,
        }),
      );
      expect(defaultProps.onScoreSubmitted).toHaveBeenCalled();
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it('shows error on submission failure', async () => {
    mockPost.mockRejectedValue(new Error('Score already exists'));
    renderWithClient(<ScoreSubmissionModal {...defaultProps} />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/events/event1'));

    fireEvent.focus(screen.getByLabelText(/Competitor/));
    await waitFor(() => expect(screen.getByText(/Alice/)).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByText(/Alice/));

    fireEvent.change(screen.getByLabelText(/Workout/), { target: { value: 'act1' } });
    fireEvent.change(screen.getByLabelText(/Score/), { target: { value: '100' } });
    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText('Score already exists')).toBeInTheDocument();
    });
  });

  it('calls onClose when Cancel is clicked', async () => {
    renderWithClient(<ScoreSubmissionModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows fetch error', async () => {
    mockGet.mockRejectedValue(new Error('Network error'));
    renderWithClient(<ScoreSubmissionModal {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch event data')).toBeInTheDocument();
    });
  });

  it('opens inline competitor edit form and submits via PUT', async () => {
    mockPut.mockResolvedValue({ message: 'User updated successfully' });
    renderWithClient(<ScoreSubmissionModal {...defaultProps} />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/events/event1'));

    // Pick Alice
    fireEvent.focus(screen.getByLabelText(/Competitor/));
    await waitFor(() => expect(screen.getByText(/Alice/)).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByText(/Alice/));

    // The Edit details button should now appear next to the Competitor Details header
    const editBtn = await screen.findByRole('button', { name: /edit details/i });
    fireEvent.click(editBtn);

    // Adjust bodyweight and save
    const bwInput = screen.getByLabelText(/Bodyweight \(kg\)/);
    fireEvent.change(bwInput, { target: { value: '70' } });

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalledWith(
        '/api/admin/users/u1',
        expect.objectContaining({ bodyweight: 70 }),
      );
    });
  });

  it('shows inline edit validation error for out-of-range bodyweight', async () => {
    renderWithClient(<ScoreSubmissionModal {...defaultProps} />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/api/events/event1'));

    fireEvent.focus(screen.getByLabelText(/Competitor/));
    await waitFor(() => expect(screen.getByText(/Alice/)).toBeInTheDocument());
    fireEvent.mouseDown(screen.getByText(/Alice/));

    fireEvent.click(await screen.findByRole('button', { name: /edit details/i }));
    fireEvent.change(screen.getByLabelText(/Bodyweight \(kg\)/), { target: { value: '600' } });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(screen.getByText(/Bodyweight must be between 0 and 500 kg/)).toBeInTheDocument();
    expect(mockPut).not.toHaveBeenCalled();
  });
});
