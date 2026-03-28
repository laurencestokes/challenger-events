import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import NotificationToast from '../../components/NotificationToast';

describe('NotificationToast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing when show is false', () => {
    render(<NotificationToast message="Hello" show={false} />);
    expect(screen.queryByText('Hello')).not.toBeInTheDocument();
  });

  it('renders message when show is true', () => {
    render(<NotificationToast message="Score saved!" show={true} />);
    expect(screen.getByText('Score saved!')).toBeInTheDocument();
  });

  it('applies success styling by default', () => {
    render(<NotificationToast message="Done" show={true} />);
    const toast = screen.getByText('Done').closest('.rounded-lg');
    expect(toast?.className).toContain('bg-green-500');
  });

  it('applies error styling', () => {
    render(<NotificationToast message="Failed" show={true} type="error" />);
    const toast = screen.getByText('Failed').closest('.rounded-lg');
    expect(toast?.className).toContain('bg-red-500');
  });

  it('applies warning styling', () => {
    render(<NotificationToast message="Watch out" show={true} type="warning" />);
    const toast = screen.getByText('Watch out').closest('.rounded-lg');
    expect(toast?.className).toContain('bg-yellow-500');
  });

  it('applies info styling', () => {
    render(<NotificationToast message="FYI" show={true} type="info" />);
    const toast = screen.getByText('FYI').closest('.rounded-lg');
    expect(toast?.className).toContain('bg-blue-500');
  });

  it('calls onClose after close button is clicked (with delay)', () => {
    const onClose = jest.fn();
    render(<NotificationToast message="Test" show={true} onClose={onClose} />);

    // Find and click the close button (the X svg button)
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    // onClose is called after a 300ms delay
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders close button', () => {
    render(<NotificationToast message="Closeable" show={true} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows success icon for success type', () => {
    render(<NotificationToast message="OK" show={true} type="success" />);
    const svgs = document.querySelectorAll('svg');
    // Should have at least the success checkmark icon + close button icon
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });

  it('shows info icon for info type', () => {
    render(<NotificationToast message="Info" show={true} type="info" />);
    const svgs = document.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThanOrEqual(2);
  });
});
