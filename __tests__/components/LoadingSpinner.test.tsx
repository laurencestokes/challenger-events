import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../../components/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('should render loading spinner', () => {
    render(<LoadingSpinner />);

    // Check if the spinner container is rendered
    const container = screen.getByTestId('loading-container');
    expect(container).toBeInTheDocument();
  });

  it('should have correct CSS classes', () => {
    render(<LoadingSpinner />);

    // Check if the spinner has the correct animation class
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass('animate-spin');
  });

  it('should have the correct structure', () => {
    render(<LoadingSpinner />);

    // Check if the main container has the correct classes
    const container = screen.getByTestId('loading-container');
    expect(container).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center');

    // Check if the spinner element has the correct classes
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toHaveClass(
      'animate-spin',
      'rounded-full',
      'h-32',
      'w-32',
      'border-b-2',
      'border-indigo-600',
    );
  });
});
