import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PublicProfileShare from '../../components/PublicProfileShare';

// Mock clipboard
Object.assign(navigator, {
  clipboard: { writeText: jest.fn().mockResolvedValue(undefined) },
});

describe('PublicProfileShare', () => {
  const url = 'https://example.com/profile/user1';

  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('renders copy button', () => {
    render(<PublicProfileShare url={url} />);
    expect(screen.getByText('Copy Profile Link')).toBeInTheDocument();
  });

  it('renders QR code placeholder', () => {
    render(<PublicProfileShare url={url} />);
    expect(screen.getByText('Scan to view this profile')).toBeInTheDocument();
  });

  it('copies URL to clipboard on click', () => {
    render(<PublicProfileShare url={url} />);
    fireEvent.click(screen.getByText('Copy Profile Link'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(url);
  });

  it('shows "Copied!" text after clicking', () => {
    render(<PublicProfileShare url={url} />);
    fireEvent.click(screen.getByText('Copy Profile Link'));
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });

  it('reverts to "Copy Profile Link" after 2 seconds', () => {
    render(<PublicProfileShare url={url} />);
    fireEvent.click(screen.getByText('Copy Profile Link'));
    expect(screen.getByText('Copied!')).toBeInTheDocument();
    act(() => jest.advanceTimersByTime(2000));
    expect(screen.getByText('Copy Profile Link')).toBeInTheDocument();
  });
});
