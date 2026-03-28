import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AddScoreModal from '../../../components/ui/AddScoreModal';

const mockPost = jest.fn();
jest.mock('../../../lib/api-client', () => ({
  api: { post: (...args: any[]) => mockPost(...args) },
}));

jest.mock('@challengerco/challenger-data', () => ({
  ChallengerData: jest.fn().mockImplementation(() => ({})),
  paceToWatts: jest.fn(),
}));

describe('AddScoreModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onScoreAdded: jest.fn(),
  };

  beforeEach(() => jest.clearAllMocks());

  it('renders nothing when closed', () => {
    render(<AddScoreModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText(/select a test/i)).not.toBeInTheDocument();
  });

  it('renders modal when open', () => {
    render(<AddScoreModal {...defaultProps} />);
    expect(document.querySelector('form')).toBeInTheDocument();
  });

  it('shows activity dropdown', () => {
    render(<AddScoreModal {...defaultProps} />);
    const selects = document.querySelectorAll('select');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('shows validation error when fields are empty', async () => {
    render(<AddScoreModal {...defaultProps} />);
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(screen.getByText(/select a test and enter a value/i)).toBeInTheDocument();
    });
  });

  it('pre-selects activity when initialActivityId is provided', () => {
    render(<AddScoreModal {...defaultProps} initialActivityId="squat" />);
    const select = document.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('squat');
  });

  it('submits score via API', async () => {
    mockPost.mockResolvedValue({ score: { id: 's1', calculatedScore: 450 } });
    render(<AddScoreModal {...defaultProps} initialActivityId="squat" />);

    // Enter raw value
    const inputs = document.querySelectorAll('input');
    const valueInput = Array.from(inputs).find((i) => i.type === 'number' || i.type === 'text');
    if (valueInput) {
      fireEvent.change(valueInput, { target: { value: '140' } });
    }

    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });
  });

  it('calls onClose when close button is clicked', () => {
    render(<AddScoreModal {...defaultProps} />);
    const closeBtn = screen.getByLabelText('Close');
    fireEvent.click(closeBtn);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows error on API failure', async () => {
    mockPost.mockRejectedValue(new Error('Submission failed'));
    render(<AddScoreModal {...defaultProps} initialActivityId="squat" />);

    const inputs = document.querySelectorAll('input');
    const valueInput = Array.from(inputs).find((i) => i.type === 'number' || i.type === 'text');
    if (valueInput) {
      fireEvent.change(valueInput, { target: { value: '100' } });
    }

    fireEvent.submit(document.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText(/Submission failed/i)).toBeInTheDocument();
    });
  });
});
